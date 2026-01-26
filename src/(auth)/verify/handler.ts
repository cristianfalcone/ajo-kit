import type { Request } from 'polka'
import { url } from '/src/auth/verify'
import { send } from '/src/mail'
import { db } from '/src/data'
import { UnauthorizedError, AppError } from '/src/constants'

export async function resend(req: Request) {

	if (!req.user) throw new UnauthorizedError()

	const user = await db()
		.selectFrom('users')
		.select(['id', 'email', 'verified'])
		.where('id', '=', req.user.id)
		.executeTakeFirst()

	if (!user) throw new UnauthorizedError()
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
