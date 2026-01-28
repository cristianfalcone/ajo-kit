import type { Request } from 'polka'
import { object, string, pipe, forward, partialCheck } from 'valibot'
import { validate, consume } from '/src/auth/reset'
import { hash } from '/src/auth/password'
import { db, parse, password } from '/src/data'
import { AppError } from '/src/constants'

const Reset = pipe(
	object({
		password,
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
	const token = req.params.token
	const user = await validate(token)
	return { valid: !!user }
}

export const actions = {

	default: async (req: Request) => {

		const token = req.params.token
		const user = await consume(token)

		if (!user) throw new AppError(400, 'Invalid or expired reset link')

		const input = parse(Reset, req.body)
		const hashed = await hash(input.password)

		await db().updateTable('users').set({ password: hashed }).where('id', '=', user).execute()
		await db().deleteFrom('sessions').where('user', '=', user).execute()

		return { redirect: '/login' }
	}
}
