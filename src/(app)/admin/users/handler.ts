import type { Request } from '@kit'
import { db } from '/src/data'

export async function page(req: Request) {
	req.track?.('admin:users')

	const users = await db()
		.selectFrom('users')
		.leftJoin('members', 'members.user', 'users.id')
		.leftJoin('roles', 'roles.id', 'members.role')
		.select([
			'users.id',
			'users.name',
			'users.email',
			'users.verified',
			'users.created',
			'roles.name as role'
		])
		.orderBy('users.created', 'desc')
		.execute()

	return { users }
}
