import type { Request } from 'polka'
import { object, string, array, optional, pipe, minLength } from 'valibot'
import { create, list } from '/src/auth/token'
import { db, parse, trimmed } from '/src/data'

export const deps = ['tokens', ':user']

const Create = object({
	name: pipe(trimmed, minLength(1, 'Token name is required')),
	abilities: optional(array(string()), [])
})

const Revoke = object({ id: string() })

export async function page(req: Request) {

	const tokens = await list(req.user!.id)

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
		const abilities = input.abilities.length > 0 ? input.abilities : ['*']

		const plain = await create(req.user!.id, input.name, abilities)

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

		return { revoked: true }
	}
}
