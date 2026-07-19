import { session } from '@kit/auth'
import { db as base } from '@kit/database'
import type { DB, Signup } from './types'

export type { Signup }

export type Input = {
	email: string
	name?: string | null
	inviter?: number | null
	expiry?: string | Date
}

export type Invitation = {
	email: string
	name: string
	expiry: string
}

export type Acceptance = {
	name?: string | null
	passwordHash: string
}

const day = 24 * 60 * 60 * 1000
const week = 7 * day
const singleton = 1

const db = () => base<DB>()
const stamp = (time = Date.now()) => new Date(time).toISOString()
const clean = (value: string | null | undefined) => value?.trim() ?? ''
const normalize = (email: string) => email.trim().toLowerCase()
const identity = (token: string) => session.hash(token)
const expires = (value: string | Date | undefined) =>
	value instanceof Date ? value.toISOString() : value ?? stamp(Date.now() + week)

function signup(value: string): Signup {
	if (value === 'open' || value === 'invite') return value

	throw new Error(`Invalid registration signup mode: ${value}`)
}

/** Returns the durable signup mode, initializing the singleton policy row when needed. */
export async function policy(): Promise<Signup> {
	const row = await db()
		.selectFrom('registration')
		.select('signup')
		.where('id', '=', singleton)
		.executeTakeFirst()

	if (row) return signup(row.signup)

	await db()
		.insertInto('registration')
		.values({ id: singleton, signup: 'open', updated: null, updater: null })
		.onConflict(oc => oc.column('id').doNothing())
		.execute()

	const saved = await db()
		.selectFrom('registration')
		.select('signup')
		.where('id', '=', singleton)
		.executeTakeFirst()

	return saved ? signup(saved.signup) : 'open'
}

/** Persists the singleton signup mode and records the admin who changed it. */
export async function set(value: Signup, user: number): Promise<void> {
	const next = signup(value)
	const now = stamp()

	await db()
		.insertInto('registration')
		.values({ id: singleton, signup: next, updated: now, updater: user })
		.onConflict(oc => oc.column('id').doUpdateSet({
			signup: next,
			updated: now,
			updater: user,
		}))
		.execute()
}

/** Creates a one-time invitation and returns its plaintext bearer token. */
export async function create(input: Input): Promise<string> {
	const email = normalize(input.email)

	if (!email) throw new Error('Invitation email is required')

	const plain = session.generate()
	const id = identity(plain)
	const now = stamp()

	await db().transaction().execute(async trx => {
		await trx
			.updateTable('invitations')
			.set({ revoked: now })
			.where('email', '=', email)
			.where('accepted', 'is', null)
			.where('revoked', 'is', null)
			.where('expiry', '>=', now)
			.execute()

		await trx
			.insertInto('invitations')
			.values({
				id,
				email,
				name: clean(input.name),
				inviter: input.inviter ?? null,
				expiry: expires(input.expiry),
			})
			.execute()
	})

	return plain
}

/** Resolves an active invitation token without exposing its stored token hash. */
export async function get(token: string): Promise<Invitation | null> {
	const invite = await db()
		.selectFrom('invitations')
		.select(['email', 'name', 'expiry'])
		.where('id', '=', identity(token))
		.where('accepted', 'is', null)
		.where('revoked', 'is', null)
		.where('expiry', '>=', stamp())
		.executeTakeFirst()

	return invite ?? null
}

/** Accepts an active invitation once, creating the invited user in the same transaction. */
export async function accept(token: string, input: Acceptance): Promise<number | null> {
	const id = identity(token)
	const now = stamp()

	return db().transaction().execute(async trx => {
		const invite = await trx
			.selectFrom('invitations')
			.select(['email', 'name'])
			.where('id', '=', id)
			.where('accepted', 'is', null)
			.where('revoked', 'is', null)
			.where('expiry', '>=', now)
			.executeTakeFirst()

		if (!invite) return null

		const exists = await trx
			.selectFrom('users')
			.select('id')
			.where('email', '=', invite.email)
			.executeTakeFirst()

		if (exists) return null

		const claimed = await trx
			.updateTable('invitations')
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
				email: invite.email,
				name: clean(input.name) || invite.name,
				password: input.passwordHash,
				verified: now,
			})
			.returning('id')
			.executeTakeFirstOrThrow()

		const role = await trx
			.selectFrom('roles')
			.select('id')
			.where('name', '=', 'user')
			.executeTakeFirst()

		if (role) {
			await trx
				.insertInto('members')
				.values({ user: created.id, role: role.id })
				.execute()
		}

		await trx
			.updateTable('invitations')
			.set({ acceptor: created.id })
			.where('id', '=', id)
			.execute()

		return created.id
	})
}

/** Marks a pending invitation revoked without deleting its audit row. */
export async function revoke(id: string): Promise<void> {
	await db()
		.updateTable('invitations')
		.set({ revoked: stamp() })
		.where('id', '=', id)
		.where('accepted', 'is', null)
		.where('revoked', 'is', null)
		.execute()
}
