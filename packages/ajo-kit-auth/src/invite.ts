import type { Kysely } from 'ajo-kit/database'
import { generate, hash } from './session'
import { db } from './store'
import type { Auth } from './types'

const day = 24 * 60 * 60 * 1000
const week = 7 * day

const stamp = (at = Date.now()) => new Date(at).toISOString()
const clean = (value: string | undefined) => value?.trim() ?? ''
const normalize = (email: string | undefined) => email?.trim().toLowerCase() ?? ''
const identity = (token: string) => hash(token)

type Presentation = {
	role: string
	name: string
	email: string | null
	team: number | null
	user: number | null
}

const presentation = (
	row: Omit<Presentation, 'user'>,
	user: number | null
): Presentation => ({
	role: row.role,
	name: row.name,
	email: row.email,
	team: row.team,
	user,
})

async function presentable(store: Kysely<Auth>, id: string, now = stamp()): Promise<Presentation | null> {
	const row = await store
		.selectFrom('invites')
		.select(['role', 'name', 'email', 'team', 'accepted', 'acceptor'])
		.where('id', '=', id)
		.where('revoked', 'is', null)
		.where('expiry', '>=', now)
		.executeTakeFirst()

	if (!row) return null
	if (row.accepted === null) return presentation(row, null)
	if (row.acceptor === null) return null

	const user = await store
		.selectFrom('users')
		.select('password')
		.where('id', '=', row.acceptor)
		.executeTakeFirst()

	if (!user || user.password !== null) return null

	const credential = await store
		.selectFrom('credentials')
		.select('id')
		.where('user', '=', row.acceptor)
		.executeTakeFirst()

	return credential ? null : presentation(row, row.acceptor)
}

/** Creates a single-use invitation and returns its plaintext token once. */
export async function create(input: {
	role: string
	email?: string
	name?: string
	team?: number
	inviter?: number
	ttl?: number
}): Promise<string> {
	const email = input.email === undefined ? null : normalize(input.email)

	if (email === '') throw new Error('Invitation email is required')

	const token = `ajoinv_${generate()}`
	const now = stamp()

	await db().transaction().execute(async trx => {
		if (input.team !== undefined) {
			const team = await trx
				.selectFrom('teams')
				.select('id')
				.where('id', '=', input.team)
				.executeTakeFirst()

			if (!team) throw new Error(`Unknown team: ${input.team}`)
		}

		if (email !== null) {
			await trx
				.updateTable('invites')
				.set({ revoked: now })
				.where('email', '=', email)
				.where('accepted', 'is', null)
				.where('revoked', 'is', null)
				.where('expiry', '>=', now)
				.execute()
		}

		await trx
			.insertInto('invites')
			.values({
				id: identity(token),
				email,
				name: clean(input.name),
				role: input.role,
				team: input.team ?? null,
				inviter: input.inviter ?? null,
				expiry: stamp(Date.now() + (input.ttl ?? week)),
				accepted: null,
				acceptor: null,
				revoked: null,
			})
			.execute()
	})

	return token
}

/** Resolves a presentable invitation without exposing its stored token hash. */
export async function get(token: string): Promise<Presentation | null> {
	return presentable(db(), identity(token))
}

/**
 * Accepts an invitation atomically. A passwordHash is stored verbatim; an
 * account is marked verified only for an email-bound invitation with a hash.
 */
export async function accept(token: string, input: {
	email?: string
	name?: string
	passwordHash?: string
}): Promise<number | null> {
	const id = identity(token)
	const now = stamp()

	return db().transaction().execute(async trx => {
		const view = await presentable(trx, id, now)

		if (!view) return null
		if (view.user !== null) return view.user

		const email = view.email ?? normalize(input.email)

		if (!email) return null

		const exists = await trx
			.selectFrom('users')
			.select('id')
			.where('email', '=', email)
			.executeTakeFirst()

		if (exists) return null

		const claimed = await trx
			.updateTable('invites')
			.set({ accepted: now })
			.where('id', '=', id)
			.where('accepted', 'is', null)
			.where('revoked', 'is', null)
			.where('expiry', '>=', now)
			.executeTakeFirst()

		if (claimed.numUpdatedRows !== 1n) return null

		const created = await trx
			.insertInto('users')
			.values({
				email,
				name: clean(input.name) || view.name,
				password: input.passwordHash ?? null,
				verified: view.email !== null && input.passwordHash ? now : null,
			})
			.returning('id')
			.executeTakeFirstOrThrow()

		const role = await trx
			.selectFrom('roles')
			.select('id')
			.where('name', '=', view.role)
			.executeTakeFirst()

		if (!role) throw new Error(`Unknown invitation role: ${view.role}`)

		if (view.team !== null) {
			await trx
				.insertInto('teammates')
				.values({ team: view.team, user: created.id, role: role.id })
				.execute()
		} else {
			await trx
				.insertInto('members')
				.values({ user: created.id, role: role.id })
				.onConflict(conflict => conflict.doNothing())
				.execute()
		}

		await trx
			.updateTable('invites')
			.set({ acceptor: created.id })
			.where('id', '=', id)
			.execute()

		return Number(created.id)
	})
}

/** Marks a pending invitation revoked while keeping its audit row. */
export async function revoke(id: string): Promise<void> {
	await db()
		.updateTable('invites')
		.set({ revoked: stamp() })
		.where('id', '=', id)
		.where('accepted', 'is', null)
		.where('revoked', 'is', null)
		.execute()
}

/** Lists active pending invitations without plaintext credentials. */
export async function list(): Promise<{
	id: string
	email: string | null
	name: string
	role: string
	team: number | null
	inviter: number | null
	expiry: string
}[]> {
	return db()
		.selectFrom('invites')
		.select(['id', 'email', 'name', 'role', 'team', 'inviter', 'expiry'])
		.where('accepted', 'is', null)
		.where('revoked', 'is', null)
		.where('expiry', '>=', stamp())
		.orderBy('expiry')
		.orderBy('id')
		.execute()
}
