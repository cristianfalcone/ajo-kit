import * as auth from 'ajo-kit-auth'
import type { ActionContext, Request, Response } from 'ajo-kit'
import { object, string, array, optional, pipe, minLength, parse } from 'ajo-kit/validate'
import { trimmed } from '/src/data'
import { listed, requested } from '/src/data/tokens'
import { grantable } from '/src/abilities'

const Create = object({
	name: pipe(trimmed, minLength(1, 'Token name is required')),
	abilities: optional(array(string()), [])
})

const Revoke = object({ id: string() })

export async function page(req: Request) {
	auth.authorize(req, 'tokens:read')

	return {
		tokens: await listed(req.user!.id),
		grantable: grantable(req.user!.abilities),
	}
}

export const actions = {

	make: async (req: Request, _res: Response, action: ActionContext) => {

		auth.authorize(req, 'tokens:create')

		const input = parse(Create, req.body)
		const abilities = requested(input.abilities, grantable(req.user!.abilities))

		const plain = await auth.token.create(req.user!.id, input.name, abilities)
		action.emit([`user:${req.user!.id}`, 'admin:tokens', 'admin:stats'])

		return { token: plain }
	},

	revoke: async (req: Request, _res: Response, action: ActionContext) => {

		auth.authorize(req, 'tokens:delete')

		const input = parse(Revoke, req.body)

		if (!await auth.token.revoke(req.user!.id, input.id)) return { revoked: false }

		action.emit([`user:${req.user!.id}`, 'admin:tokens', 'admin:stats'])

		return { revoked: true }
	}
}
