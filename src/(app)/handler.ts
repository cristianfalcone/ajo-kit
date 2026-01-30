import type { Request, Response } from 'polka'
import { db } from '/src/data'
import { sql } from 'kysely'
import { read, clear } from '/src/auth/cookie'
import { remove } from '/src/auth/session'
import { emit } from '/src/server'

const unreadCount = async (userId: number) => {

	const row = await db()
		.selectFrom('messages')
		.innerJoin('participants', 'participants.chat', 'messages.chat')
		.where('participants.user', '=', userId)
		.where('messages.user', '!=', userId)
		.where((eb) => eb.or([
			eb('participants.seen', 'is', null),
			eb(sql`datetime(messages.created)`, '>', sql`datetime(participants.seen)`)
		]))
		.select(db().fn.countAll().as('count'))
		.executeTakeFirst()

	return Number(row?.count ?? 0)
}

export async function layout(req: Request) {
	const unread = await unreadCount(req.user!.id)
	return { user: req.user, unread }
}

export const events = {
	unread: async (req: Request) => {
		const unread = await unreadCount(req.user!.id)
		return { unread }
	}
}

export const actions = {
	signout: async (req: Request, res: Response) => {
		const token = read(req)
		if (token) await remove(token)
		clear(res)
		emit('activity')
		return { redirect: '/login' }
	}
}
