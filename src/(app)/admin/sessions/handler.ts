import type { Request } from 'polka'
import { object, string, pipe, transform, number } from 'valibot'
import { db } from '/src/data'
import { parse } from '@kit/validate'

export const deps = ['sessions', 'users']

const RevokeSession = object({ id: string() })
const RevokeUser = object({ user: pipe(string(), transform(v => Number(v)), number()) })

export async function page() {

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

export const events = { sessions: page }

export const actions = {

	revoke: async (req: Request) => {

		const input = parse(RevokeSession, req.body)

		const session = await db()
			.selectFrom('sessions')
			.select(['id'])
			.where('id', 'like', `${input.id}%`)
			.executeTakeFirst()

		if (!session) return { revoked: false }

		await db()
			.deleteFrom('sessions')
			.where('id', '=', session.id)
			.execute()

		return { revoked: true }
	},

	revokeUser: async (req: Request) => {

		const input = parse(RevokeUser, req.body)

		const result = await db()
			.deleteFrom('sessions')
			.where('user', '=', input.user)
			.execute()

		return { revoked: Number(result[0].numDeletedRows) }
	}
}
