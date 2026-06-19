import type { Parent, Request } from '@kit'
import { object, string, optional, pipe, forward, partialCheck } from '@kit/validate'
import { hash, verify } from '@kit/auth/password'
import { db, password as passwordField, trimmed } from '/src/data'
import { parse } from '@kit/validate'
import { UnauthorizedError } from '@kit'
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

	password: async (req: Request) => {

		const input = parse(UpdatePassword, req.body)

		const user = await db()
			.selectFrom('users')
			.select(['password'])
			.where('id', '=', req.user!.id)
			.executeTakeFirst()

		if (!user?.password || !await verify(input.current, user.password)) {
			throw new UnauthorizedError('Current password is incorrect')
		}

		const hashed = await hash(input.password)

		await db()
			.updateTable('users')
			.set({ password: hashed, updated: new Date().toISOString() })
			.where('id', '=', req.user!.id)
			.execute()
		emit([`profile:${req.user!.id}`, `dashboard:${req.user!.id}`, `user:${req.user!.id}`])

		return { success: true }
	}
}
