import type { Request } from '@kit'
import { object, string, pipe, transform, number } from '@kit/validate'
import { db } from '/src/data'
import { parse } from '@kit/validate'
import { emit } from '@kit/server'

const RevokeSession = object({ id: string() })
const RevokeUser = object({ user: pipe(string(), transform(v => Number(v)), number()) })

export async function page(req: Request) {
	req.track?.('admin:sessions')

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
		.execute()

	return {
		sessions: sessions.map(s => ({
			...s,
			id: s.id.slice(0, 8)
		}))
	}
}

export const actions = {

	revoke: async (req: Request) => {

		const input = parse(RevokeSession, req.body)

		const session = await db()
			.selectFrom('sessions')
			.select(['id', 'user'])
			.where('id', 'like', `${input.id}%`)
			.executeTakeFirst()

		if (!session) return { revoked: false }

		await db()
			.deleteFrom('sessions')
			.where('id', '=', session.id)
			.execute()
		emit(['admin:sessions', 'admin:stats', `sessions:${session.user}`, `dashboard:${session.user}`, `user:${session.user}`])

		return { revoked: true }
	},

	revokeUser: async (req: Request) => {

		const input = parse(RevokeUser, req.body)

		const result = await db()
			.deleteFrom('sessions')
			.where('user', '=', input.user)
			.execute()
		emit(['admin:sessions', 'admin:stats', `sessions:${input.user}`, `dashboard:${input.user}`, `user:${input.user}`])

		return { revoked: Number(result[0].numDeletedRows) }
	}
}
