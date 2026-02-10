import type { Request } from 'polka'
import { object, string } from 'valibot'
import { db } from '/src/data'
import { parse } from '@kit/validate'

export const deps = ['tokens', 'users']

const Revoke = object({ id: string() })

export async function page() {

	const tokens = await db()
		.selectFrom('tokens')
		.innerJoin('users', 'users.id', 'tokens.user')
		.select([
			'tokens.id',
			'tokens.name',
			'tokens.abilities',
			'tokens.last',
			'tokens.expiry',
			'tokens.created',
			'users.name as userName',
			'users.email'
		])
		.orderBy('tokens.created', 'desc')
		.execute()

	return {
		tokens: tokens.map(t => ({
			...t,
			id: t.id.slice(-4),
			abilities: JSON.parse(t.abilities)
		}))
	}
}

export const events = { tokens: page }

export const actions = {
	default: async (req: Request) => {
		const input = parse(Revoke, req.body)

		const token = await db()
			.selectFrom('tokens')
			.select(['id'])
			.where('id', 'like', `%${input.id}`)
			.executeTakeFirst()

		if (!token) return { revoked: false }

		await db()
			.deleteFrom('tokens')
			.where('id', '=', token.id)
			.execute()

		return { revoked: true }
	}
}
