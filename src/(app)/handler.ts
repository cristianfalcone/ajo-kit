import type { Request, Response } from '@kit'
import { Denied } from '@kit'
import { db, unread } from '/src/data'
import { read, clear } from '@kit/auth/cookie'
import { remove } from '@kit/auth/session'
import { clear as forget } from '@kit/auth/confirm'
import { emit } from '@kit/server'

export async function layout(req: Request) {
	if (!req.user) throw new Denied()
	req.track?.(`user:${req.user.id}`)

	const match = req.path.match(/^\/account\/chats\/(\d+)/)
	const activeChatId = match ? Number(match[1]) : undefined
	const user = await db()
		.selectFrom('users')
		.select(['id', 'name', 'email', 'verified', 'created'])
		.where('id', '=', req.user.id)
		.executeTakeFirst()

	return {
		user: { ...req.user, ...user, roles: req.user.roles ?? [] },
		unread: await unread(req.user.id, activeChatId),
	}
}

export const actions = {
	signout: async (req: Request, res: Response) => {
		const token = read(req)
		if (token) {
			await remove(token)
			emit([`sessions:${req.user!.id}`, `dashboard:${req.user!.id}`, `user:${req.user!.id}`, 'admin:sessions', 'admin:stats'])
		}
		forget(req)
		clear(res)
		return { redirect: '/login' }
	}
}
