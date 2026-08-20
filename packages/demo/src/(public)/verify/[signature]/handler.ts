import * as auth from '@kit/auth'
import type { Request } from '@kit'
import { emit } from '@kit/server'

export async function page(req: Request) {

	const user = await auth.verify.validate(req.params.signature)

	if (!user) {
		return { error: 'Invalid or expired verification link' }
	}

	emit([`profile:${user}`, `dashboard:${user}`, `user:${user}`, 'admin:users'])

	return { redirect: '/dashboard', verified: true }
}
