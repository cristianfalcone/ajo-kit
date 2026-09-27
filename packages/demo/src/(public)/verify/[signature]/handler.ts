import * as auth from 'ajo-kit-auth'
import type { Request } from 'ajo-kit'
import { emit } from 'ajo-kit/server'

export async function page(req: Request) {

	const user = await auth.verify.validate(req.params.signature)

	if (!user) {
		return { error: 'Invalid or expired verification link' }
	}

	emit([`profile:${user}`, `dashboard:${user}`, `user:${user}`, 'admin:users'])

	return { redirect: '/dashboard', verified: true }
}
