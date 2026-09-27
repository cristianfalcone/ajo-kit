import * as auth from 'ajo-kit-auth'
import type { ActionContext, Request, Response } from 'ajo-kit'
import { Denied } from 'ajo-kit'
import { db, unread } from '/src/data'

export async function layout(req: Request) {
	if (!req.user) throw new Denied()
	req.track?.(`user:${req.user.id}`)

	const match = req.path.match(/^\/account\/chats\/(\d+)/)
	const activeChatId = match ? Number(match[1]) : undefined
	const { created } = await db()
		.selectFrom('users')
		.select('created')
		.where('id', '=', req.user.id)
		.executeTakeFirstOrThrow()

	return {
		user: { ...req.user, created },
		unread: await unread(req.user.id, activeChatId),
	}
}

export const actions = {
	signout: async (req: Request, res: Response, action: ActionContext) => {
		const token = auth.cookie.read(req)
		if (token) {
			await auth.session.remove(token)
			action.emit([`user:${req.user!.id}`, 'admin:sessions', 'admin:stats'])
		}
		auth.confirm.clear(req)
		auth.cookie.clear(res)
		return { redirect: '/login' }
	}
}
