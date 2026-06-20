import type { Request, Response } from '@kit'
import { send, emit } from '@kit/server'
import { object, string, array, optional } from '@kit/validate'
import { create, list, all } from '@kit/auth/token'
import { authorize } from '@kit/auth/guard'
import { check, hit } from '@kit/auth/limit'
import { token as forget } from '@kit/auth/confirm'
import { db } from '/src/data'
import { parse } from '@kit/validate'
import { Missing, Failure, Forbidden } from '@kit'
import { normalize, unknown as invalid } from '/src/abilities'

const Create = object({
	name: string(),
	abilities: optional(array(string()), ['*']),
})

const requested = (abilities: string[]) => {
	const requested = normalize(abilities)
	const bad = invalid(requested)

	if (bad.length > 0) {
		throw new Failure(400, `Unknown abilities: ${bad.join(', ')}`)
	}

	return requested
}

export default {

	async get(req: Request, res: Response) {

		authorize(req, 'tokens:read')

		const tokens = await list(req.user!.id)

		const masked = tokens.map(t => ({
			id: t.id.slice(-4),
			name: t.name,
			abilities: JSON.parse(t.abilities),
			last_used: t.last,
			expires_at: t.expiry,
			created: t.created
		}))

		send(res, 200, { tokens: masked })
	},

	async post(req: Request, res: Response) {

		authorize(req, 'tokens:create')

		const key = `token:${req.user!.id}`

		if (!check(key)) {
			throw new Failure(429, 'Too many token creation attempts. Try again later.')
		}

		hit(key)

		const input = parse(Create, req.body)
		const abilities = requested(input.abilities)

		if (req.token && !all(req.token.abilities, abilities)) {
			throw new Forbidden('Requested abilities exceed bearer token abilities')
		}

		const token = await create(
			req.user!.id,
			input.name,
			abilities
		)
		emit([`tokens:${req.user!.id}`, `dashboard:${req.user!.id}`, `user:${req.user!.id}`, 'admin:tokens', 'admin:stats'])

		const expires_at = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

		send(res, 201, {
			token,
			expires_at,
			message: 'Save this token securely. It will not be shown again.'
		})
	},

	async delete(req: Request, res: Response) {

		authorize(req, 'tokens:delete')

		const partialId = req.body.id

		if (!partialId) throw new Failure(400, 'Token ID required')

		const tokens = await db()
			.selectFrom('tokens')
			.select(['id'])
			.where('user', '=', req.user!.id)
			.execute()

		const match = tokens.find(t => t.id.slice(-4) === partialId)

		if (!match) throw new Missing('Token not found')

		await db()
			.deleteFrom('tokens')
			.where('id', '=', match.id)
			.execute()
		forget(req.user!.id, match.id)
		emit([`tokens:${req.user!.id}`, `dashboard:${req.user!.id}`, `user:${req.user!.id}`, 'admin:tokens', 'admin:stats'])

		send(res, 200, { message: 'Token revoked' })
	}
}
