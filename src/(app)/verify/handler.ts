import * as auth from '@kit/auth'
import type { Request } from '@kit'
import { send } from '@kit/mail'
import { db } from '/src/data'
import { Failure, origin } from '@kit'

export const actions = {

	default: async (req: Request) => {

		const key = `verify:${req.user!.id}`

		if (!auth.limit.check(key)) {
			throw new Failure(429, 'Too many verification requests. Try again later.')
		}

		auth.limit.hit(key)

		const user = await db()
			.selectFrom('users')
			.select(['id', 'email', 'verified'])
			.where('id', '=', req.user!.id)
			.executeTakeFirst()

		if (!user) throw new Failure(404, 'User not found')
		if (user.verified) throw new Failure(400, 'Email already verified')

		const base = origin(req)
		const link = auth.verify.url(user.id, base)

		await send({
			to: user.email,
			subject: 'Verify your email',
			text: `Click here to verify your email: ${link}\n\nThis link expires in 24 hours.`,
		})

		return { sent: true }
	}
}
