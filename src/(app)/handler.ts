import type { Request, Response } from 'polka'
import { db, unread } from '/src/data'
import { read, clear } from '@kit/auth/cookie'
import { remove } from '@kit/auth/session'
import { UnauthorizedError } from '@kit'

export const deps = {
	user: ['users', 'members', ':user'],
	unread: ['messages', 'participants', ':user'],
}

const status = async (req: Request) => {

	if (!req.user) throw new UnauthorizedError()

	const [user, count, roles] = await Promise.all([

		db()
			.selectFrom('users')
			.select(['id', 'name', 'email', 'verified'])
			.where('id', '=', req.user.id)
			.executeTakeFirstOrThrow(),

		unread(req.user.id),

		db()
			.selectFrom('members')
			.innerJoin('roles', 'roles.id', 'members.role')
			.select(['roles.name'])
			.where('members.user', '=', req.user.id)
			.execute()
			.then(rows => rows.map(r => r.name))
	])

	return { user: { ...user, roles }, unread: count }
}

export async function layout(req: Request) {
	return status(req)
}

export const events = { status }

export const actions = {
	signout: async (req: Request, res: Response) => {
		const token = read(req)
		if (token) await remove(token)
		clear(res)
		return { redirect: '/login' }
	}
}
