import * as auth from 'ajo-kit-auth'
import type { Request } from 'ajo-kit'
import { Failure, origin } from 'ajo-kit'
import { send as mail } from 'ajo-kit/mail'
import { db } from '/src/data'

export type VerificationResult = { sent: true }

/** Sends a fresh email verification link for the signed-in user. */
export async function resend(req: Request): Promise<VerificationResult> {
	const key = `verify:${req.user!.id}`

	if (!auth.limit.hit(key)) {
		throw new Failure(429, 'Too many verification requests. Try again later.')
	}

	const user = await db()
		.selectFrom('users')
		.select(['id', 'email', 'verified'])
		.where('id', '=', req.user!.id)
		.executeTakeFirst()

	if (!user) throw new Failure(404, 'User not found')
	if (user.verified) throw new Failure(400, 'Email already verified')

	const base = origin(req)
	const link = auth.verify.url(user.id, user.email, base)

	await mail({
		to: user.email,
		subject: 'Verify your email',
		text: `Click here to verify your email: ${link}\n\nThis link expires in 24 hours.`,
	})

	return { sent: true }
}
