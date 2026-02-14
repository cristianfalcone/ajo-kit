import type { Request } from '@kit'
import { object, string } from '@kit/validate'
import { db } from '/src/data'
import { parse } from '@kit/validate'
import { emit } from '@kit/server'

const Revoke = object({ id: string() })

export async function page(req: Request) {
	req.track?.('admin:tokens')

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
export const actions = {
	default: async (req: Request) => {
		const input = parse(Revoke, req.body)

		const token = await db()
			.selectFrom('tokens')
			.select(['id', 'user'])
			.where('id', 'like', `%${input.id}`)
			.executeTakeFirst()

		if (!token) return { revoked: false }

		await db()
			.deleteFrom('tokens')
			.where('id', '=', token.id)
			.execute()
		emit(['admin:tokens', 'admin:stats', `tokens:${token.user}`, `dashboard:${token.user}`, `user:${token.user}`])

		return { revoked: true }
	}
}
