import type { Parent, Request } from '@kit'
import { db } from '/src/data'
import { read } from '@kit/auth/cookie'
import { hash as digest } from '@kit/auth/session'

type Shell = {
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

	const { user: account, unread } = await parent() as Shell
	const user = account.id
	const cookie = read(req)
	const session = cookie ? digest(cookie) : undefined

	const [sessions, tokens, chats, recent] = await Promise.all([
		db()
			.selectFrom('sessions')
			.select(db().fn.countAll().as('count'))
			.where('user', '=', user)
			.executeTakeFirstOrThrow(),
		db()
			.selectFrom('tokens')
			.select(db().fn.countAll().as('count'))
			.where('user', '=', user)
			.executeTakeFirstOrThrow(),
		db()
			.selectFrom('participants')
			.select(db().fn.countAll().as('count'))
			.where('user', '=', user)
			.executeTakeFirstOrThrow(),
		db()
			.selectFrom('sessions')
			.select(['id', 'ip', 'agent', 'last', 'created'])
			.where('user', '=', user)
			.orderBy('last', 'desc')
			.limit(5)
			.execute(),
	])

	return {
		user: { ...account, roles: account.roles ?? [] },
		stats: {
			sessions: Number(sessions.count),
			tokens: Number(tokens.count),
			chats: Number(chats.count),
			unread,
		},
		recentSessions: recent.map(s => ({
			id: s.id.slice(0, 8),
			ip: s.ip,
			agent: s.agent,
			last: s.last,
			created: s.created,
			current: s.id === session,
		})),
	}
}