import type { Request } from 'polka'
import { url } from '@kit/auth/verify'
import { check, hit } from '@kit/auth/limit'
import { send } from '@kit/mail'
import { db } from '/src/data'
import { AppError } from '@kit'

export const actions = {

	default: async (req: Request) => {

		const key = `verify:${req.user!.id}`

		if (!check(key)) {
			throw new AppError(429, 'Too many verification requests. Try again later.')
		}

		hit(key)

		const user = await db()
			.selectFrom('users')
			.select(['id', 'email', 'verified'])
			.where('id', '=', req.user!.id)
			.executeTakeFirst()

		if (!user) throw new AppError(404, 'User not found')
		if (user.verified) throw new AppError(400, 'Email already verified')

		const base = process.env.APP_URL || `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`
		const link = url(user.id, base)

		await send({
			to: user.email,
			subject: 'Verify your email',
			text: `Click here to verify your email: ${link}\n\nThis link expires in 24 hours.`,
		})

		return { sent: true }
	}
}
