import type { Request } from 'polka'
import { object, string, optional, pipe, forward, partialCheck } from 'valibot'
import { hash, verify } from '@kit/auth/password'
import { db, password as passwordField, trimmed } from '/src/data'
import { parse } from '@kit/validate'
import { UnauthorizedError } from '@kit'

// Skip handler if users table hasn't changed and same user
export const deps = ['users', ':user']

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

export async function page(req: Request) {

	const user = await db()
		.selectFrom('users')
		.select(['id', 'name', 'email'])
		.where('id', '=', req.user!.id)
		.executeTakeFirst()

	return { user }
}

export const actions = {

	name: async (req: Request) => {

		const input = parse(UpdateName, req.body)

		await db()
			.updateTable('users')
			.set({ name: input.name, updated: new Date().toISOString() })
			.where('id', '=', req.user!.id)
			.execute()

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

		return { success: true }
	}
}
