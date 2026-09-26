import * as auth from '@kit/auth'
import type { ActionContext, Request, Response } from '@kit'
import { object, string } from '@kit/validate'
import { db } from '/src/data'
import { parse } from '@kit/validate'

const Revoke = object({ id: string() })

export async function page(req: Request) {
	req.track?.([`sessions:${req.user!.id}`, `dashboard:${req.user!.id}`, `user:${req.user!.id}`])

	await auth.session.prune()

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
			id: s.id,
			ip: s.ip,
			agent: s.agent,
			last: s.last,
			created: s.created,
			current: s.id === current
		}))
	}
}

export const actions = {

	revoke: async (req: Request, _res: Response, action: ActionContext) => {

		const input = parse(Revoke, req.body)
		const cookie = auth.cookie.read(req)
		const current = cookie ? auth.session.hash(cookie) : undefined

		if (input.id === current) return { revoked: false }

		const revoked = await db()
			.deleteFrom('sessions')
			.where('user', '=', req.user!.id)
			.where('id', '=', input.id)
			.executeTakeFirst()

		if (revoked.numDeletedRows === 0n) return { revoked: false }

		auth.confirm.clearSession(req.user!.id, input.id)
		action.emit([`sessions:${req.user!.id}`, `dashboard:${req.user!.id}`, `user:${req.user!.id}`, 'admin:sessions', 'admin:stats'])

		return { revoked: true }
	},

	purge: async (req: Request, _res: Response, action: ActionContext) => {

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
		action.emit([`sessions:${req.user!.id}`, `dashboard:${req.user!.id}`, `user:${req.user!.id}`, 'admin:sessions', 'admin:stats'])

		return { revoked: revoked.length }
	}
}
