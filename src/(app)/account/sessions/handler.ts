import type { Request } from '@kit'
import { object, string } from '@kit/validate'
import { read } from '@kit/auth/cookie'
import { db } from '/src/data'
import { parse } from '@kit/validate'
import { emit } from '@kit/server'

const Revoke = object({ id: string() })

export async function page(req: Request) {
	req.track?.([`sessions:${req.user!.id}`, `dashboard:${req.user!.id}`, `user:${req.user!.id}`])

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
		emit([`sessions:${req.user!.id}`, `dashboard:${req.user!.id}`, `user:${req.user!.id}`, 'admin:sessions', 'admin:stats'])

		return { revoked: true }
	},

	revokeAll: async (req: Request) => {

		const current = read(req)

		const result = await db()
			.deleteFrom('sessions')
			.where('user', '=', req.user!.id)
			.where('id', '!=', current!)
			.execute()
		emit([`sessions:${req.user!.id}`, `dashboard:${req.user!.id}`, `user:${req.user!.id}`, 'admin:sessions', 'admin:stats'])

		return { revoked: Number(result[0].numDeletedRows) }
	}
}
