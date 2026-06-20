import type { Request } from '@kit'
import { object } from '@kit/validate'
import { create } from '@kit/auth/reset'
import { check, hit } from '@kit/auth/limit'
import { send } from '@kit/mail'
import { db, email } from '/src/data'
import { parse } from '@kit/validate'
import { Failure, ip, origin } from '@kit'

const Forgot = object({ email })

export const actions = {

	default: async (req: Request) => {

		const input = parse(Forgot, req.body)
		const addr = ip(req)
		const key = `forgot:${input.email}:${addr}`
		const base = origin(req)

		if (!check(key)) {
			throw new Failure(429, 'Too many reset attempts. Try again later.')
		}

		hit(key)

		const user = await db()
			.selectFrom('users')
			.select(['id', 'email'])
			.where('email', '=', input.email)
			.executeTakeFirst()

		if (user) {

			const token = await create(user.id)
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
