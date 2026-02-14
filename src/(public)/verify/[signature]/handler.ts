import type { Request } from '@kit'
import { validate } from '@kit/auth/verify'
import { db } from '/src/data'
import { emit } from '@kit/server'

export async function page(req: Request) {

	const user = validate(req.params.signature)

	if (!user) {
		return { error: 'Invalid or expired verification link' }
	}

	await db()
		.updateTable('users')
		.set({ verified: new Date().toISOString() })
		.where('id', '=', user)
		.execute()
	emit([`profile:${user}`, `dashboard:${user}`, `user:${user}`, 'admin:users'])

	return { redirect: '/dashboard', verified: true }
}
