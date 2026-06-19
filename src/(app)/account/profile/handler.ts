import type { Parent, Request, Response } from '@kit'
import { object, string, optional, pipe, forward, partialCheck } from '@kit/validate'
import { hash, verify } from '@kit/auth/password'
import { generate, hash as hashSession } from '@kit/auth/session'
import { write } from '@kit/auth/cookie'
import { clearUser as clearConfirmUser } from '@kit/auth/confirm'
import { db, password as passwordField, trimmed } from '/src/data'
import { parse } from '@kit/validate'
import { UnauthorizedError, ip } from '@kit'
import { emit } from '@kit/server'

const UpdateName = object({
	name: optional(trimmed, ''),
})

const UpdatePassword = pipe(
	object({
		current: string(),
		password: passwordField,
		confirm: string(),
	}),
	forward(
		partialCheck(
			[['password'], ['confirm']],
			input => input.password === input.confirm,
			'Passwords must match'
		),
		['confirm']
	)
)

type AppParent = {
	user: {
		id: number
		name: string
		email: string
	}
}

export async function page(req: Request, parent: Parent) {
	req.track?.([`profile:${req.user!.id}`, `user:${req.user!.id}`])

	const { user } = await parent() as AppParent

	return {
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
		}
	}
}

export const actions = {

	name: async (req: Request) => {

		const input = parse(UpdateName, req.body)

		await db()
			.updateTable('users')
			.set({ name: input.name, updated: new Date().toISOString() })
			.where('id', '=', req.user!.id)
			.execute()
		emit([`profile:${req.user!.id}`, `dashboard:${req.user!.id}`, `user:${req.user!.id}`, 'admin:users'])

		return { success: true, name: input.name }
	},

	password: async (req: Request, res: Response) => {

		const input = parse(UpdatePassword, req.body)
		const userId = req.user!.id

		const user = await db()
			.selectFrom('users')
			.select(['password'])
			.where('id', '=', userId)
			.executeTakeFirst()

		if (!user?.password || !await verify(input.current, user.password)) {
			throw new UnauthorizedError('Current password is incorrect')
		}

		const hashed = await hash(input.password)
		const session = generate()
		const sessionId = hashSession(session)
		const now = new Date().toISOString()
		const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

		await db().transaction().execute(async trx => {
			await trx.updateTable('users')
				.set({ password: hashed, updated: now })
				.where('id', '=', userId)
				.execute()

			await trx.deleteFrom('tokens').where('user', '=', userId).execute()
			await trx.deleteFrom('sessions').where('user', '=', userId).execute()

			await trx.insertInto('sessions').values({
				id: sessionId,
				user: userId,
				expiry,
				ip: ip(req),
				agent: req.headers['user-agent'] ?? null,
				last: now,
			}).execute()
		})

		write(res, session)
		clearConfirmUser(userId)
		emit([
			`profile:${userId}`,
			`sessions:${userId}`,
			`tokens:${userId}`,
			`dashboard:${userId}`,
			`user:${userId}`,
			'admin:sessions',
			'admin:tokens',
			'admin:users',
			'admin:stats',
		])

		return { success: true }
	}
}
