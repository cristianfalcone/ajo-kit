import * as auth from 'ajo-kit-auth'
import { Failure, type Request, type Response } from 'ajo-kit'
import { configure, type Sealed } from 'ajo-kit-mail'
import { env, randomBase64Url, sha256Hex, timingSafeEqual } from 'ajo-kit/platform'
import { send } from 'ajo-kit/server'
import { bundles } from '/src/abilities'
import { db } from '/src/data'
import type { CountQuery, FixtureOperation, InvitationInput, MakeUserInput, ResetInput, Signup } from './fixture-client'

const limit = 32
const mail: Sealed[] = []

// A plain transport, not a dev one, so the production acceptance build accepts it too.
configure({
	from: 'fixture@example.com',
	transport: async message => {
		mail.push(message)
		if (mail.length > limit) mail.splice(0, mail.length - limit)
	},
})

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
		await trx.deleteFrom('invites').execute()
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
			{ id: 3, name: 'support', abilities: JSON.stringify(['admin:read']) },
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
	const token = input.token ?? `ajoinv_${randomBase64Url(32)}`
	const now = new Date().toISOString()
	await db().insertInto('invites').values({
		id: sha256Hex(token),
		email: input.email.trim().toLowerCase(),
		name: input.name ?? '',
		role: 'user',
		team: null,
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

const total = async (query: { executeTakeFirstOrThrow(): Promise<{ count: number | bigint | string }> }) =>
	Number((await query.executeTakeFirstOrThrow()).count)

const count = ({ table, user, email, accepted, revoked, verified }: CountQuery) => {
	const all = db().fn.countAll().as('count')
	const set = (value: boolean) => value ? 'is not' : 'is'

	switch (table) {
		case 'users':
			return total(db().selectFrom('users').select(all).where('email', '=', email!)
				.$if(verified !== undefined, query => query.where('verified', set(verified!), null)))
		case 'sessions':
			return total(db().selectFrom('sessions').select(all).where('user', '=', user!))
		case 'tokens':
			return total(db().selectFrom('tokens').select(all).where('user', '=', user!))
		case 'resets':
			return total(db().selectFrom('resets').select(all).where('user', '=', user!))
		case 'invites':
			return total(db().selectFrom('invites').select(all).where('email', '=', email!)
				.$if(accepted !== undefined, query => query.where('accepted', set(accepted!), null))
				.$if(revoked !== undefined, query => query.where('revoked', set(revoked!), null)))
	}
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
		case 'verificationPath': {
			const user = await db()
				.selectFrom('users')
				.select('email')
				.where('id', '=', input.user)
				.executeTakeFirstOrThrow()
			return { path: `/verify/${auth.verify.sign(input.user, user.email)}` }
		}
		case 'mailClear': {
			const cleared = mail.length
			mail.length = 0
			return { cleared }
		}
		case 'mailLast': {
			const found = input.to
				? mail.findLast(message => message.to.address === input.to)
				: mail.at(-1)
			if (!found) return { mail: null }
			const { to, subject, text, html } = found
			return { mail: { to: to.address, subject, text, ...(html !== undefined && { html }) } }
		}
	}
}

export default {
	async post(req: Request, res: Response) {
		if (!authorized(req)) throw new Failure(404, 'Not found')
		send(res, 200, await dispatch(req.body as FixtureOperation))
	},
}
