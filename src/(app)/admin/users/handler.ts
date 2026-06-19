import type { Request } from '@kit'
import { db } from '/src/data'
import { pageInfo, pageRows, paginate } from '/src/data/pagination'

export async function page(req: Request) {
	req.track?.('admin:users')
	const pagination = paginate(req)

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
		.limit(pagination.size + 1)
		.offset(pagination.offset)
		.execute()

	return {
		users: pageRows(pagination, users),
		page: pageInfo(req, pagination, users),
	}
}
