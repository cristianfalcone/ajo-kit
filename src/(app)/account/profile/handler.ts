import * as auth from '@kit/auth'
import type { Parent, Request, Response } from '@kit'
import { object, string, optional, pipe, forward, partialCheck } from '@kit/validate'
import { db, password as passwordField, trimmed } from '/src/data'
import { parse } from '@kit/validate'
import { Denied, ip } from '@kit'
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

type Shell = {
	user: {
		id: number
		name: string
		email: string
	}
}

export async function page(req: Request, parent: Parent) {
	req.track?.([`profile:${req.user!.id}`, `user:${req.user!.id}`])

	const { user } = await parent() as Shell

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
		const id = req.user!.id

		const account = await db()
			.selectFrom('users')
			.select(['password'])
			.where('id', '=', id)
			.executeTakeFirst()

		if (!account?.password || !await auth.password.verify(input.current, account.password)) {
			throw new Denied('Current password is incorrect')
		}

		const hashed = await auth.password.hash(input.password)
		const plain = auth.session.generate()
		const session = auth.session.hash(plain)
		const now = new Date().toISOString()
		const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

		await db().transaction().execute(async trx => {
			await trx.updateTable('users')
				.set({ password: hashed, updated: now })
				.where('id', '=', id)
				.execute()

			await trx.deleteFrom('tokens').where('user', '=', id).execute()
			await trx.deleteFrom('sessions').where('user', '=', id).execute()

			await trx.insertInto('sessions').values({
				id: session,
				user: id,
				expiry,
				ip: ip(req),
				agent: req.headers['user-agent'] ?? null,
				last: now,
			}).execute()
		})

		auth.cookie.write(res, plain)
		auth.confirm.user(id)
		emit([
			`profile:${id}`,
			`sessions:${id}`,
			`tokens:${id}`,
			`dashboard:${id}`,
			`user:${id}`,
			'admin:sessions',
			'admin:tokens',
			'admin:users',
			'admin:stats',
		])

		return { success: true }
	}
}