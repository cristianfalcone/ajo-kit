import * as auth from 'ajo-kit-auth'
import type { ActionContext, Request, Response } from 'ajo-kit'
import { object, string, pipe, transform, number, parse } from 'ajo-kit/validate'
import { db } from '/src/data'
import { info, rows as trim, paginate } from '/src/data/pagination'

const RevokeSession = object({ id: string() })
const RevokeUser = object({ user: pipe(string(), transform(v => Number(v)), number()) })

export async function page(req: Request) {
	req.track?.('admin:sessions')
	await auth.session.prune()

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
		sessions: rows,
		page: info(req, pagination, sessions),
	}
}

export const actions = {

	revoke: async (req: Request, _res: Response, action: ActionContext) => {

		const input = parse(RevokeSession, req.body)

		const session = await db()
			.deleteFrom('sessions')
			.where('id', '=', input.id)
			.returning(['id', 'user'])
			.executeTakeFirst()

		if (!session) return { revoked: false }

		auth.confirm.clearSession(session.user, session.id)
		action.emit(['admin:sessions', 'admin:stats', `user:${session.user}`])

		return { revoked: true }
	},

	revokeUser: async (req: Request, _res: Response, action: ActionContext) => {

		const input = parse(RevokeUser, req.body)

		const revoked = await db()
			.deleteFrom('sessions')
			.where('user', '=', input.user)
			.returning('id')
			.execute()
		for (const session of revoked) auth.confirm.clearSession(input.user, session.id)
		action.emit(['admin:sessions', 'admin:stats', `user:${input.user}`])

		return { revoked: revoked.length }
	}
}
