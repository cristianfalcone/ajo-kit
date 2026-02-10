import type { Request } from 'polka'
import { db, unread } from '/src/data'
import { read } from '@kit/auth/cookie'

export const deps = {
	user: ['users', 'members', ':user'],
	stats: ['sessions', 'tokens', 'participants', 'messages', ':user'],
	recentSessions: ['sessions', ':user'],
}

export async function page(req: Request) {

	const userId = req.user!.id

	const [user, sessions, tokens, chats, count, recentSessions, roles] = await Promise.all([
		db()
			.selectFrom('users')
			.select(['id', 'name', 'email', 'verified', 'created'])
			.where('id', '=', userId)
			.executeTakeFirstOrThrow(),
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
		unread(userId),
		db()
			.selectFrom('sessions')
			.select(['id', 'ip', 'agent', 'last', 'created'])
			.where('user', '=', userId)
			.orderBy('last', 'desc')
			.limit(5)
			.execute(),
		db()
			.selectFrom('members')
			.innerJoin('roles', 'roles.id', 'members.role')
			.select(['roles.name'])
			.where('members.user', '=', userId)
			.execute(),
	])

	return {
		user: { ...user, roles: roles.map(r => r.name) },
		stats: {
			sessions: Number(sessions.count),
			tokens: Number(tokens.count),
			chats: Number(chats.count),
			unread: Number(count),
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

export const events = { activity: page }
