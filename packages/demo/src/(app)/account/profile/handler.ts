import * as auth from 'ajo-kit-auth'
import type { ActionContext, Parent, Request, Response } from 'ajo-kit'
import { object, string, optional, pipe, forward, partialCheck, parse } from 'ajo-kit/validate'
import { db, password as passwordField, trimmed } from '/src/data'
import { Denied, Failure, ip } from 'ajo-kit'

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

	name: async (req: Request, _res: Response, action: ActionContext) => {

		const input = parse(UpdateName, req.body)

		await db()
			.updateTable('users')
			.set({ name: input.name, updated: new Date().toISOString() })
			.where('id', '=', req.user!.id)
			.execute()
		action.emit([`profile:${req.user!.id}`, `dashboard:${req.user!.id}`, `user:${req.user!.id}`, 'admin:users'])

		return { success: true, name: input.name }
	},

	password: async (req: Request, res: Response, action: ActionContext) => {

		const input = parse(UpdatePassword, req.body)
		const id = req.user!.id
		const limit = `password:${id}`

		if (!auth.limit.hit(limit)) {
			throw new Failure(429, 'Too many password attempts. Try again later.')
		}

		const account = await db()
			.selectFrom('users')
			.select(['password'])
			.where('id', '=', id)
			.executeTakeFirst()

		if (!account?.password || !await auth.password.verify(input.current, account.password)) {
			throw new Denied('Current password is incorrect')
		}

		auth.limit.clear(limit)

		const hashed = await auth.password.hash(input.password)

		await db().transaction().execute(async trx => {
			await trx.updateTable('users')
				.set({ password: hashed, updated: new Date().toISOString() })
				.where('id', '=', id)
				.execute()

			await trx.deleteFrom('tokens').where('user', '=', id).execute()
			await trx.deleteFrom('sessions').where('user', '=', id).execute()
		})

		auth.confirm.clearUser(id)
		auth.cookie.write(res, await auth.session.create(id, false, ip(req), req.headers['user-agent']))
		action.emit([
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
