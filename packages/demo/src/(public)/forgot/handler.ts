import * as auth from 'ajo-kit-auth'
import type { Request } from 'ajo-kit'
import { object, parse } from 'ajo-kit/validate'
import { send } from 'ajo-kit/mail'
import { db, email } from '/src/data'
import { Failure, ip, origin } from 'ajo-kit'

const Forgot = object({ email })

export const actions = {

	default: async (req: Request) => {

		const input = parse(Forgot, req.body)
		const addr = ip(req)
		const key = `forgot:${input.email}:${addr}`
		const base = origin(req)

		if (!auth.limit.hit(key)) {
			throw new Failure(429, 'Too many reset attempts. Try again later.')
		}

		const user = await db()
			.selectFrom('users')
			.select(['id', 'email'])
			.where('email', '=', input.email)
			.executeTakeFirst()

		if (user) {

			const token = await auth.reset.create(user.id)
			const url = `${base}/reset/${token}`

			// Delivery stays off the response path so known and unknown emails answer alike.
			send({
				to: user.email,
				subject: 'Reset your password',
				text: `Click here to reset your password: ${url}\n\nThis link expires in 1 hour.`,
			}).catch(error => console.error('Password reset mail failed', error))
		}

		return { message: 'If that email exists, we sent a reset link.' }
	}
}
