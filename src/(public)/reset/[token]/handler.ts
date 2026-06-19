import type { Request } from '@kit'
import { createHash } from 'node:crypto'
import { object, string, pipe, forward, partialCheck } from '@kit/validate'
import { validate } from '@kit/auth/reset'
import { hash } from '@kit/auth/password'
import { clearUser as clearConfirmUser } from '@kit/auth/confirm'
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
		const input = parse(Reset, req.body)
		const hashed = await hash(input.password)
		const reset = createHash('sha256').update(token).digest('hex')
		const now = new Date().toISOString()
		let user!: number

		await db().transaction().execute(async trx => {
			const consumed = await trx
				.deleteFrom('resets')
				.where('id', '=', reset)
				.where('expiry', '>=', now)
				.returning('user')
				.executeTakeFirst()

			if (!consumed) throw new AppError(400, 'Invalid or expired reset link')

			user = consumed.user

			await trx.updateTable('users').set({ password: hashed, updated: now }).where('id', '=', user).execute()
			await trx.deleteFrom('sessions').where('user', '=', user).execute()
			await trx.deleteFrom('tokens').where('user', '=', user).execute()
			await trx.deleteFrom('resets').where('user', '=', user).execute()
		})

		clearConfirmUser(user)
		emit([
			`profile:${user}`,
			`sessions:${user}`,
			`tokens:${user}`,
			`dashboard:${user}`,
			`user:${user}`,
			'admin:sessions',
			'admin:tokens',
			'admin:users',
			'admin:stats',
		])

		return { redirect: '/login' }
	}
}
