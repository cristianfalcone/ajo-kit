import * as auth from 'ajo-kit-auth'
import type { Request } from 'ajo-kit'
import { Failure, origin } from 'ajo-kit'
import { deliver } from 'ajo-kit-mail'
import { db } from '/src/data'

export const actions = {

	/** Sends a fresh email verification link for the signed-in user. */
	default: async (req: Request) => {

		if (!auth.limit.hit(`verify:${req.user!.id}`)) {
			throw new Failure(429, 'Too many verification requests. Try again later.')
		}

		const user = await db()
			.selectFrom('users')
			.select(['id', 'email', 'verified'])
			.where('id', '=', req.user!.id)
			.executeTakeFirstOrThrow()

		if (user.verified) throw new Failure(400, 'Email already verified')

		const outcome = await deliver({
			to: user.email,
			subject: 'Verify your email',
			text: `Click here to verify your email: ${auth.verify.url(user.id, user.email, origin(req))}\n\nThis link expires in 24 hours.`,
		})
		if (!outcome.ok) throw outcome.error

		return { sent: true as const }
	},
}
