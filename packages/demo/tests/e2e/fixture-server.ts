import * as auth from '@kit/auth'
import { Failure, type Request, type Response } from '@kit'
import { configure, type Mail } from '@kit/mail'
import { env, randomUUID, sha256Hex, timingSafeEqual } from '@kit/platform'
import { send } from '@kit/server'
import { bundles } from '/src/abilities'
import { db } from '/src/data'
import type {
	CountQuery,
	FixtureOperation,
	InvitationInput,
	MakeUserInput,
	ResetInput,
	Signup,
} from './fixture-client'

const limit = 32
const mail: Mail[] = []

configure(async message => {
	mail.push({ ...message })
	if (mail.length > limit) mail.splice(0, mail.length - limit)
})

const invalid = (): never => { throw new Failure(400, 'Invalid fixture request') }
const object = (value: unknown): Record<string, unknown> => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid()
	return value as Record<string, unknown>
}
const shape = (value: unknown, allowed: readonly string[]) => {
	const input = object(value)
	if (Object.keys(input).some(key => !allowed.includes(key))) return invalid()
	return input
}
const text = (input: Record<string, unknown>, key: string, empty = false) => {
	const value = input[key]
	if (typeof value !== 'string' || (!empty && !value) || value.length > 10_000) return invalid()
	return value
}
const flag = (input: Record<string, unknown>, key: string) => {
	const value = input[key]
	if (value === undefined) return undefined
	if (typeof value !== 'boolean') return invalid()
	return value
}
const id = (value: unknown) => {
	if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) return invalid()
	return value
}
const expiry = (value: string | undefined) => {
	if (value !== undefined && !Number.isFinite(Date.parse(value))) return invalid()
	return value
}

const makeInput = (value: unknown): MakeUserInput => {
	const input = shape(value, ['email', 'password', 'name', 'role', 'verified'])
	const role = input.role
	if (role !== undefined && role !== 'admin' && role !== 'user') return invalid()

	return {
		email: text(input, 'email')!,
		...(input.password !== undefined && { password: text(input, 'password')! }),
		...(input.name !== undefined && { name: text(input, 'name', true)! }),
		...(role !== undefined && { role }),
		...(input.verified !== undefined && { verified: flag(input, 'verified')! }),
	}
}

const resetInput = (value: unknown): ResetInput => {
	const input = shape(value, ['user', 'token', 'expiry'])
	const until = expiry(input.expiry === undefined ? undefined : text(input, 'expiry'))
	return {
		user: id(input.user),
		token: text(input, 'token')!,
		...(until && { expiry: until }),
	}
}

const invitationInput = (value: unknown): InvitationInput => {
	const input = shape(value, ['email', 'name', 'token', 'expiry', 'revoked', 'accepted'])
	const until = expiry(input.expiry === undefined ? undefined : text(input, 'expiry'))
	return {
		email: text(input, 'email')!,
		...(input.name !== undefined && { name: text(input, 'name', true)! }),
		...(input.token !== undefined && { token: text(input, 'token')! }),
		...(until && { expiry: until }),
		...(input.revoked !== undefined && { revoked: flag(input, 'revoked')! }),
		...(input.accepted !== undefined && { accepted: flag(input, 'accepted')! }),
	}
}

const signup = (value: unknown): Signup => {
	if (value !== 'open' && value !== 'invite') return invalid()
	return value
}

const countInput = (value: unknown): CountQuery => {
	const input = shape(value, ['table', 'where', 'value'])
	const table = input.table
	const where = input.where
	const valueOf = input.value
	const allowed =
		(table === 'users' && typeof valueOf === 'string' &&
			(where === 'email = ?' || where === 'email = ? and verified is not null')) ||
		((table === 'sessions' || table === 'tokens' || table === 'resets') &&
			where === 'user = ?' && typeof valueOf === 'number' && Number.isSafeInteger(valueOf) && valueOf > 0) ||
		(table === 'invitations' && typeof valueOf === 'string' && [
			'email = ?',
			'email = ? and accepted is not null',
			'email = ? and revoked is not null',
			'email = ? and accepted is null and revoked is null',
		].includes(where as string))

	if (!allowed) return invalid()
	return input as unknown as CountQuery
}

const operation = (value: unknown): FixtureOperation => {
	const input = object(value)
	if (typeof input.op !== 'string') return invalid()

	switch (input.op) {
		case 'seed':
		case 'getRegistration':
		case 'mailClear':
			if (Object.keys(input).length !== 1) return invalid()
			return { op: input.op }
		case 'makeUser':
			if (Object.keys(input).length !== 2) return invalid()
			return { op: input.op, input: makeInput(input.input) }
		case 'putReset':
			if (Object.keys(input).length !== 2) return invalid()
			return { op: input.op, input: resetInput(input.input) }
		case 'putInvitation':
			if (Object.keys(input).length !== 2) return invalid()
			return { op: input.op, input: invitationInput(input.input) }
		case 'setRegistration':
			if (Object.keys(input).length !== 2) return invalid()
			return { op: input.op, signup: signup(input.signup) }
		case 'count':
			if (Object.keys(input).length !== 2) return invalid()
			return { op: input.op, query: countInput(input.query) }
		case 'verificationPath':
			if (Object.keys(input).length !== 2) return invalid()
			return { op: input.op, user: id(input.user) }
		case 'mailLast': {
			const value = shape(input, ['op', 'to'])
			return { op: input.op, ...(value.to !== undefined && { to: text(value, 'to')! }) }
		}
		default:
			return invalid()
	}
}

const authorized = (req: Request) => {
	const expected = env('AJO_E2E_CONTROL')
	const actual = req.headers['x-ajo-e2e-control']
	if (!expected || typeof actual !== 'string') return false
	const encoder = new TextEncoder()
	return timingSafeEqual(
		encoder.encode(sha256Hex(actual)),
		encoder.encode(sha256Hex(expected)),
	)
}

const seed = async () => {
	const password = await auth.password.hash('password')
	const now = new Date()
	const current = now.toISOString()
	const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString()

	await db().transaction().execute(async trx => {
		await trx.deleteFrom('challenges').execute()
		await trx.deleteFrom('credentials').execute()
		await trx.deleteFrom('messages').execute()
		await trx.deleteFrom('participants').execute()
		await trx.deleteFrom('chats').execute()
		await trx.deleteFrom('invitations').execute()
		await trx.deleteFrom('members').execute()
		await trx.deleteFrom('sessions').execute()
		await trx.deleteFrom('tokens').execute()
		await trx.deleteFrom('resets').execute()
		await trx.deleteFrom('roles').execute()
		await trx.deleteFrom('users').execute()

		await trx.insertInto('registration').values({
			id: 1,
			signup: 'open',
			updated: null,
			updater: null,
		}).onConflict(conflict => conflict.column('id').doUpdateSet({
			signup: 'open',
			updated: null,
			updater: null,
		})).execute()

		await trx.insertInto('roles').values([
			{ id: 1, name: 'admin', abilities: JSON.stringify(bundles.admin) },
			{ id: 2, name: 'user', abilities: JSON.stringify(bundles.user) },
		]).execute()

		const cristian = await trx.insertInto('users').values({
			name: 'Cristian Falcone',
			email: 'cristian@example.com',
			password,
			verified: current,
		}).returning('id').executeTakeFirstOrThrow()
		const emily = await trx.insertInto('users').values({
			name: 'Emily Stone',
			email: 'emily@example.com',
			password,
			verified: current,
		}).returning('id').executeTakeFirstOrThrow()
		const extras: Array<{ id: number }> = []

		for (let index = 1; index <= 30; index++) {
			const suffix = String(index).padStart(2, '0')
			extras.push(await trx.insertInto('users').values({
				name: `Test User ${suffix}`,
				email: `user${suffix}@example.com`,
				password,
				verified: current,
				created: ago(100 + index),
			}).returning('id').executeTakeFirstOrThrow())
		}

		await trx.insertInto('members').values([
			{ user: cristian.id, role: 1 },
			{ user: emily.id, role: 2 },
			...extras.map(user => ({ user: user.id, role: 2 })),
		]).execute()

		await trx.insertInto('tokens').values({
			id: sha256Hex('seed-api-token'),
			user: cristian.id,
			name: 'Seed API Token',
			abilities: JSON.stringify(['tokens:read']),
			last: null,
			expiry: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
		}).execute()

		const chat = await trx.insertInto('chats').values({ name: null })
			.returning('id').executeTakeFirstOrThrow()
		await trx.insertInto('participants').values([
			{ chat: chat.id, user: cristian.id, seen: current },
			{ chat: chat.id, user: emily.id, seen: current },
		]).execute()
		await trx.insertInto('messages').values(Array.from({ length: 12 }, (_, index) => ({
			chat: chat.id,
			user: index % 2 === 0 ? emily.id : cristian.id,
			text: index === 11 ? 'Hello from the e2e seed' : `Seed chat message ${index + 1}`,
			created: ago(24 - index),
		}))).execute()
	})

	mail.length = 0
}

const makeUser = async (input: MakeUserInput) => {
	const password = await auth.password.hash(input.password ?? 'password')
	const now = new Date().toISOString()
	return db().transaction().execute(async trx => {
		const user = await trx.insertInto('users').values({
			name: input.name ?? input.email,
			email: input.email,
			password,
			verified: input.verified === false ? null : now,
			created: now,
			updated: now,
		}).returning('id').executeTakeFirstOrThrow()
		const role = await trx.selectFrom('roles').select('id')
			.where('name', '=', input.role ?? 'user').executeTakeFirstOrThrow()
		await trx.insertInto('members').values({ user: user.id, role: role.id }).execute()
		return user.id
	})
}

const putReset = async (input: ResetInput) => {
	await db().transaction().execute(async trx => {
		await trx.deleteFrom('resets').where('user', '=', input.user).execute()
		await trx.insertInto('resets').values({
			id: sha256Hex(input.token),
			user: input.user,
			expiry: input.expiry ?? new Date(Date.now() + 60 * 60 * 1000).toISOString(),
		}).execute()
	})
}

const putInvitation = async (input: InvitationInput) => {
	const token = input.token ?? `invite-${randomUUID()}`
	const now = new Date().toISOString()
	await db().insertInto('invitations').values({
		id: sha256Hex(token),
		email: input.email.trim().toLowerCase(),
		name: input.name ?? '',
		inviter: null,
		expiry: input.expiry ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
		accepted: input.accepted ? now : null,
		acceptor: null,
		revoked: input.revoked ? now : null,
	}).execute()
	return token
}

const setRegistration = async (mode: Signup) => {
	const updated = new Date().toISOString()
	await db().insertInto('registration').values({ id: 1, signup: mode, updated, updater: null })
		.onConflict(conflict => conflict.column('id').doUpdateSet({ signup: mode, updated, updater: null }))
		.execute()
}

const getRegistration = async () => {
	const row = await db().selectFrom('registration').select('signup').where('id', '=', 1)
		.executeTakeFirstOrThrow()
	return row.signup
}

const count = async (query: CountQuery): Promise<number> => {
	let result: { count: number | bigint | string | null }

	if (query.table === 'users') {
		let request = db().selectFrom('users').select(db().fn.countAll().as('count')).where('email', '=', query.value)
		if (query.where.endsWith('verified is not null')) request = request.where('verified', 'is not', null)
		result = await request.executeTakeFirstOrThrow()
	} else if (query.table === 'sessions') {
		result = await db().selectFrom('sessions').select(db().fn.countAll().as('count'))
			.where('user', '=', query.value).executeTakeFirstOrThrow()
	} else if (query.table === 'tokens') {
		result = await db().selectFrom('tokens').select(db().fn.countAll().as('count'))
			.where('user', '=', query.value).executeTakeFirstOrThrow()
	} else if (query.table === 'resets') {
		result = await db().selectFrom('resets').select(db().fn.countAll().as('count'))
			.where('user', '=', query.value).executeTakeFirstOrThrow()
	} else {
		let request = db().selectFrom('invitations').select(db().fn.countAll().as('count'))
			.where('email', '=', String(query.value))
		if (query.where.includes('accepted is not null')) request = request.where('accepted', 'is not', null)
		if (query.where.includes('accepted is null')) request = request.where('accepted', 'is', null)
		if (query.where.includes('revoked is not null')) request = request.where('revoked', 'is not', null)
		if (query.where.includes('revoked is null')) request = request.where('revoked', 'is', null)
		result = await request.executeTakeFirstOrThrow()
	}

	return Number(result.count)
}

const dispatch = async (input: FixtureOperation) => {
	switch (input.op) {
		case 'seed':
			await seed()
			return { seeded: true }
		case 'makeUser':
			return { user: await makeUser(input.input) }
		case 'putReset':
			await putReset(input.input)
			return { token: input.input.token }
		case 'putInvitation':
			return { token: await putInvitation(input.input) }
		case 'setRegistration':
			await setRegistration(input.signup)
			return { signup: input.signup }
		case 'getRegistration':
			return { signup: await getRegistration() }
		case 'count':
			return { count: await count(input.query) }
		case 'verificationPath':
			return { path: `/verify/${auth.verify.sign(input.user)}` }
		case 'mailClear': {
			const cleared = mail.length
			mail.length = 0
			return { cleared }
		}
		case 'mailLast': {
			const found = input.to
				? mail.findLast(message => message.to === input.to)
				: mail.at(-1)
			return { mail: found ? { ...found } : null }
		}
	}
}

export default {
	async post(req: Request, res: Response) {
		if (!authorized(req)) throw new Failure(404, 'Not found')
		send(res, 200, await dispatch(operation(req.body)))
	},
}
