import type { Parent, Request } from '@kit'
import { db } from '/src/data'
import { read } from '@kit/auth/cookie'

type AppParent = {
	user: {
		id: number
		name: string
		email: string
		verified: string | null
		created: string
		roles?: string[]
	}
	unread: number
}

export async function page(req: Request, parent: Parent) {
	req.track?.([`dashboard:${req.user!.id}`, `user:${req.user!.id}`])

	const { user, unread } = await parent() as AppParent
	const userId = user.id

	const [sessions, tokens, chats, recentSessions] = await Promise.all([
		db()
			.selectFrom('sessions')
			.select(db().fn.countAll().as('count'))
			.where('user', '=', userId)
			.executeTakeFirstOrThrow(),
		db()
			.selectFrom('tokens')
			.select(db().fn.countAll().as('count'))
			.where('user', '=', userId)
			.executeTakeFirstOrThrow(),
		db()
			.selectFrom('participants')
			.select(db().fn.countAll().as('count'))
			.where('user', '=', userId)
			.executeTakeFirstOrThrow(),
		db()
			.selectFrom('sessions')
			.select(['id', 'ip', 'agent', 'last', 'created'])
			.where('user', '=', userId)
			.orderBy('last', 'desc')
			.limit(5)
			.execute(),
	])

	return {
		user: { ...user, roles: user.roles ?? [] },
		stats: {
			sessions: Number(sessions.count),
			tokens: Number(tokens.count),
			chats: Number(chats.count),
			unread,
		},
		recentSessions: recentSessions.map(s => ({
			id: s.id.slice(0, 8),
			ip: s.ip,
			agent: s.agent,
			last: s.last,
			created: s.created,
			current: s.id === read(req),
		})),
	}
}
