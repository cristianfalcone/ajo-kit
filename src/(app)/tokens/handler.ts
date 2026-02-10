import type { Request, Response } from 'polka'
import send from '@polka/send'
import { object, string, array, optional } from 'valibot'
import { create, list } from '@kit/auth/token'
import { check, hit } from '@kit/auth/limit'
import { db } from '/src/data'
import { parse } from '@kit/validate'
import { NotFoundError, AppError } from '@kit'

const Create = object({
	name: string(),
	abilities: optional(array(string()), ['*']),
})

export default {

	async get(req: Request, res: Response) {

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

		const key = `token:${req.user!.id}`

		if (!check(key)) {
			throw new AppError(429, 'Too many token creation attempts. Try again later.')
		}

		hit(key)

		const input = parse(Create, req.body)

		const token = await create(
			req.user!.id,
			input.name,
			input.abilities
		)

		const expires_at = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

		send(res, 201, {
			token,
			expires_at,
			message: 'Save this token securely. It will not be shown again.'
		})
	},

	async delete(req: Request, res: Response) {

		const partialId = req.body.id

		if (!partialId) throw new AppError(400, 'Token ID required')

		const tokens = await db()
			.selectFrom('tokens')
			.select(['id'])
			.where('user', '=', req.user!.id)
			.execute()

		const match = tokens.find(t => t.id.slice(-4) === partialId)

		if (!match) throw new NotFoundError('Token not found')

		await db()
			.deleteFrom('tokens')
			.where('id', '=', match.id)
			.execute()

		send(res, 200, { message: 'Token revoked' })
	}
}
