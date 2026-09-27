import * as auth from 'ajo-kit-auth'
import type { ActionContext, Request, Response } from 'ajo-kit'
import { object, string, array, optional, pipe, minLength, parse } from 'ajo-kit/validate'
import { trimmed } from '/src/data'
import { Failure, Forbidden } from 'ajo-kit'
import { delegate, grantable, normalize, unknown as invalid } from '/src/abilities'

const Create = object({
	name: pipe(trimmed, minLength(1, 'Token name is required')),
	abilities: optional(array(string()), [])
})

const Revoke = object({ id: string() })

const requested = (abilities: string[], grants: string[]) => {
	const requested = normalize(abilities)
	const bad = invalid(requested)

	if (bad.length > 0) {
		throw new Failure(400, `Unknown abilities: ${bad.join(', ')}`)
	}

	return delegate(abilities, grants)
}

export async function page(req: Request) {
	auth.authorize(req, 'tokens:read')
	req.track?.([`tokens:${req.user!.id}`, `dashboard:${req.user!.id}`, `user:${req.user!.id}`])

	const tokens = await auth.token.list(req.user!.id)

	return {
		tokens: tokens.map(t => ({
			id: t.id,
			name: t.name,
			abilities: JSON.parse(t.abilities),
			last: t.last,
			created: t.created
		})),
		grantable: grantable(req.user!.abilities),
	}
}

export const actions = {

	make: async (req: Request, _res: Response, action: ActionContext) => {

		auth.authorize(req, 'tokens:create')

		const input = parse(Create, req.body)
		const grants = grantable(req.user!.abilities)
		const abilities = requested(input.abilities, grants)

		if (!auth.all(grants, abilities)) {
			throw new Forbidden('Requested abilities exceed account abilities')
		}

		const plain = await auth.token.create(req.user!.id, input.name, abilities)
		action.emit([`tokens:${req.user!.id}`, `dashboard:${req.user!.id}`, `user:${req.user!.id}`, 'admin:tokens', 'admin:stats'])

		return { token: plain }
	},

	revoke: async (req: Request, _res: Response, action: ActionContext) => {

		auth.authorize(req, 'tokens:delete')

		const input = parse(Revoke, req.body)

		if (!await auth.token.revoke(req.user!.id, input.id)) return { revoked: false }

		action.emit([`tokens:${req.user!.id}`, `dashboard:${req.user!.id}`, `user:${req.user!.id}`, 'admin:tokens', 'admin:stats'])

		return { revoked: true }
	}
}
