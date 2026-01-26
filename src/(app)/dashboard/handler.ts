import type { Request } from 'polka'
import { db } from '/src/data'

// Skip handler if users table hasn't changed and same user
export const deps = ['users', ':user']

export async function page(req: Request) {

	const user = await db()
		.selectFrom('users')
		.select(['id', 'name', 'email'])
		.where('id', '=', req.user!.id)
		.executeTakeFirst()

	return { user, timestamp: Date.now() }
}
