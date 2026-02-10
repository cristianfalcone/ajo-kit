import type { Request } from '@kit'
import { validate } from '@kit/auth/verify'
import { db } from '/src/data'

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

	return { redirect: '/dashboard', verified: true }
}
