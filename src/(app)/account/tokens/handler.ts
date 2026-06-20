import * as auth from '@kit/auth'
import type { Request } from '@kit'
import { object, string, array, optional, pipe, minLength } from '@kit/validate'
import { db, trimmed } from '/src/data'
import { parse } from '@kit/validate'
import { emit } from '@kit/server'
import { Failure } from '@kit'
import { normalize, unknown as invalid } from '/src/abilities'

const Create = object({
	name: pipe(trimmed, minLength(1, 'Token name is required')),
	abilities: optional(array(string()), [])
})

const Revoke = object({ id: string() })

const requested = (abilities: string[]) => {
	const requested = normalize(abilities)
	const bad = invalid(requested)

	if (bad.length > 0) {
		throw new Failure(400, `Unknown abilities: ${bad.join(', ')}`)
	}

	return requested
}

export async function page(req: Request) {
	req.track?.([`tokens:${req.user!.id}`, `dashboard:${req.user!.id}`, `user:${req.user!.id}`])

	const tokens = await auth.token.list(req.user!.id)

	return {
		tokens: tokens.map(t => ({
			id: t.id.slice(-4),
			name: t.name,
			abilities: JSON.parse(t.abilities),
			last: t.last,
			created: t.created
		}))
	}
}

export const actions = {

	make: async (req: Request) => {

		const input = parse(Create, req.body)
		const abilities = requested(input.abilities)

		const plain = await auth.token.create(req.user!.id, input.name, abilities)
		emit([`tokens:${req.user!.id}`, `dashboard:${req.user!.id}`, `user:${req.user!.id}`, 'admin:tokens', 'admin:stats'])

		return { token: plain }
	},

	revoke: async (req: Request) => {

		const input = parse(Revoke, req.body)

		const tokens = await db()
			.selectFrom('tokens')
			.select(['id'])
			.where('user', '=', req.user!.id)
			.execute()

		const match = tokens.find(t => t.id.slice(-4) === input.id)

		if (!match) {
			return { revoked: false }
		}

		await db()
			.deleteFrom('tokens')
			.where('id', '=', match.id)
			.execute()
		auth.confirm.clearToken(req.user!.id, match.id)
		emit([`tokens:${req.user!.id}`, `dashboard:${req.user!.id}`, `user:${req.user!.id}`, 'admin:tokens', 'admin:stats'])

		return { revoked: true }
	}
}
