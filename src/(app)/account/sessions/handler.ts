import * as auth from '@kit/auth'
import type { Request } from '@kit'
import { object, string } from '@kit/validate'
import { db } from '/src/data'
import { parse } from '@kit/validate'
import { emit } from '@kit/server'

const Revoke = object({ id: string() })

export async function page(req: Request) {
	req.track?.([`sessions:${req.user!.id}`, `dashboard:${req.user!.id}`, `user:${req.user!.id}`])

	const cookie = auth.cookie.read(req)
	const current = cookie ? auth.session.hash(cookie) : undefined

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
		const cookie = auth.cookie.read(req)
		const current = cookie ? auth.session.hash(cookie) : undefined

		const matches = await db()
			.selectFrom('sessions')
			.select(['id'])
			.where('user', '=', req.user!.id)
			.where('id', 'like', `${input.id}%`)
			.execute()

		if (matches.length !== 1 || matches[0].id === current) {
			return { revoked: false }
		}

		await db()
			.deleteFrom('sessions')
			.where('id', '=', matches[0].id)
			.execute()
		auth.confirm.clearSession(req.user!.id, matches[0].id)
		emit([`sessions:${req.user!.id}`, `dashboard:${req.user!.id}`, `user:${req.user!.id}`, 'admin:sessions', 'admin:stats'])

		return { revoked: true }
	},

	purge: async (req: Request) => {

		const cookie = auth.cookie.read(req)
		const current = cookie ? auth.session.hash(cookie) : undefined

		if (!current) return { revoked: 0 }

		const revoked = await db()
			.deleteFrom('sessions')
			.where('user', '=', req.user!.id)
			.where('id', '!=', current!)
			.returning('id')
			.execute()
		for (const session of revoked) auth.confirm.clearSession(req.user!.id, session.id)
		emit([`sessions:${req.user!.id}`, `dashboard:${req.user!.id}`, `user:${req.user!.id}`, 'admin:sessions', 'admin:stats'])

		return { revoked: revoked.length }
	}
}
