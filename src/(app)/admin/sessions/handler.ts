import * as auth from '@kit/auth'
import type { Request } from '@kit'
import { object, string, pipe, transform, number } from '@kit/validate'
import { db } from '/src/data'
import { info, rows as trim, paginate } from '/src/data/pagination'
import { parse } from '@kit/validate'
import { emit } from '@kit/server'

const RevokeSession = object({ id: string() })
const RevokeUser = object({ user: pipe(string(), transform(v => Number(v)), number()) })

export async function page(req: Request) {
	req.track?.('admin:sessions')
	const pagination = paginate(req)

	const sessions = await db()
		.selectFrom('sessions')
		.innerJoin('users', 'users.id', 'sessions.user')
		.select([
			'sessions.id',
			'sessions.user',
			'sessions.ip',
			'sessions.agent',
			'sessions.last',
			'sessions.created',
			'sessions.expiry',
			'users.name',
			'users.email'
		])
		.orderBy('sessions.created', 'desc')
		.limit(pagination.size + 1)
		.offset(pagination.offset)
		.execute()
	const rows = trim(pagination, sessions)

	return {
		sessions: rows.map(s => ({
			...s,
			id: s.id.slice(0, 8)
		})),
		page: info(req, pagination, sessions),
	}
}

export const actions = {

	revoke: async (req: Request) => {

		const input = parse(RevokeSession, req.body)

		const matches = await db()
			.selectFrom('sessions')
			.select(['id', 'user'])
			.where('id', 'like', `${input.id}%`)
			.execute()

		if (matches.length !== 1) return { revoked: false }

		const session = matches[0]

		await db()
			.deleteFrom('sessions')
			.where('id', '=', session.id)
			.execute()
		auth.confirm.session(session.user, session.id)
		emit(['admin:sessions', 'admin:stats', `sessions:${session.user}`, `dashboard:${session.user}`, `user:${session.user}`])

		return { revoked: true }
	},

	revokeUser: async (req: Request) => {

		const input = parse(RevokeUser, req.body)

		const revoked = await db()
			.deleteFrom('sessions')
			.where('user', '=', input.user)
			.returning('id')
			.execute()
		for (const session of revoked) auth.confirm.session(input.user, session.id)
		emit(['admin:sessions', 'admin:stats', `sessions:${input.user}`, `dashboard:${input.user}`, `user:${input.user}`])

		return { revoked: revoked.length }
	}
}
