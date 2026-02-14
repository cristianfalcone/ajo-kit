import type { Request, Response } from '@kit'
import { UnauthorizedError } from '@kit'
import { db, unread } from '/src/data'
import { read, clear } from '@kit/auth/cookie'
import { remove } from '@kit/auth/session'
import { emit } from '@kit/server'

export async function layout(req: Request) {
	if (!req.user) throw new UnauthorizedError()
	req.track?.(`user:${req.user.id}`)

	const match = req.path.match(/^\/account\/chats\/(\d+)/)
	const activeChatId = match ? Number(match[1]) : undefined

	const [user, count, roles] = await Promise.all([
		db()
			.selectFrom('users')
			.select(['id', 'name', 'email', 'verified'])
			.where('id', '=', req.user.id)
			.executeTakeFirstOrThrow(),
		unread(req.user.id, activeChatId),
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

export const actions = {
	signout: async (req: Request, res: Response) => {
		const token = read(req)
		if (token) {
			await remove(token)
			emit([`sessions:${req.user!.id}`, `dashboard:${req.user!.id}`, `user:${req.user!.id}`, 'admin:sessions', 'admin:stats'])
		}
		clear(res)
		return { redirect: '/login' }
	}
}
