import type { Request } from 'polka'
import { object, string } from 'valibot'
import { read } from '/src/auth/cookie'
import { db, parse } from '/src/data'

export const deps = ['sessions', ':user']

const Revoke = object({ id: string() })

export async function page(req: Request) {

	const current = read(req)

	const sessions = await db()
		.selectFrom('sessions')
		.select(['id', 'ip', 'agent', 'last', 'created'])
		.where('user', '=', req.user!.id)
		.orderBy('created', 'desc')
		.execute()

	return {
		sessions: sessions.map(s => ({
			id: s.id.slice(0, 8),
			ip: s.ip,
			agent: s.agent,
			last: s.last,
			created: s.created,
			current: s.id === current
		}))
	}
}

export const actions = {

	revoke: async (req: Request) => {

		const input = parse(Revoke, req.body)
		const current = read(req)

		const session = await db()
			.selectFrom('sessions')
			.select(['id'])
			.where('user', '=', req.user!.id)
			.where('id', 'like', `${input.id}%`)
			.executeTakeFirst()

		if (!session || session.id === current) {
			return { revoked: false }
		}

		await db()
			.deleteFrom('sessions')
			.where('id', '=', session.id)
			.execute()

		return { revoked: true }
	},

	revokeAll: async (req: Request) => {

		const current = read(req)

		const result = await db()
			.deleteFrom('sessions')
			.where('user', '=', req.user!.id)
			.where('id', '!=', current!)
			.execute()

		return { revoked: Number(result[0].numDeletedRows) }
	}
}
