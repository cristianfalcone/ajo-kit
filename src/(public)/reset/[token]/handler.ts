import type { Request } from '@kit'
import { object, string, pipe, forward, partialCheck } from '@kit/validate'
import { validate, consume } from '@kit/auth/reset'
import { hash } from '@kit/auth/password'
import { db, password } from '/src/data'
import { parse } from '@kit/validate'
import { AppError } from '@kit'
import { emit } from '@kit/server'

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

		await db().transaction().execute(async trx => {
			await trx.updateTable('users').set({ password: hashed }).where('id', '=', user).execute()
			await trx.deleteFrom('sessions').where('user', '=', user).execute()
		})
		emit([
			`profile:${user}`,
			`sessions:${user}`,
			`dashboard:${user}`,
			`user:${user}`,
			'admin:sessions',
			'admin:users',
			'admin:stats',
		])

		return { redirect: '/login' }
	}
}
