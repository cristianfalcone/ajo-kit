import type { Request } from 'polka'
import { object } from 'valibot'
import { create } from '/src/auth/reset'
import { check, hit } from '/src/auth/limit'
import { send } from '/src/mail'
import { db, parse, email } from '/src/data'
import { AppError, ip } from '/src/constants'

const Forgot = object({ email })

export const actions = {

	default: async (req: Request) => {

		const input = parse(Forgot, req.body)
		const addr = ip(req)
		const key = `forgot:${input.email}:${addr}`

		if (!check(key)) {
			throw new AppError(429, 'Too many reset attempts. Try again later.')
		}

		hit(key)

		const user = await db()
			.selectFrom('users')
			.select(['id', 'email'])
			.where('email', '=', input.email)
			.executeTakeFirst()

		if (user) {

			const token = await create(user.id)
			const base = process.env.APP_URL || `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`
			const url = `${base}/reset/${token}`

			await send({
				to: user.email,
				subject: 'Reset your password',
				text: `Click here to reset your password: ${url}\n\nThis link expires in 1 hour.`,
			})
		}

		return { message: 'If that email exists, we sent a reset link.' }
	}
}
