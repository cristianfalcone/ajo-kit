import type { Request } from '@kit'
import { object, string } from '@kit/validate'
import { token as forget } from '@kit/auth/confirm'
import { db } from '/src/data'
import { info, rows as trim, paginate } from '/src/data/pagination'
import { parse } from '@kit/validate'
import { emit } from '@kit/server'

const Revoke = object({ id: string() })

export async function page(req: Request) {
	req.track?.('admin:tokens')
	const pagination = paginate(req)

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
		.limit(pagination.size + 1)
		.offset(pagination.offset)
		.execute()
	const rows = trim(pagination, tokens)

	return {
		tokens: rows.map(t => ({
			...t,
			id: t.id.slice(-4),
			abilities: JSON.parse(t.abilities)
		})),
		page: info(req, pagination, tokens),
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
		forget(token.user, token.id)
		emit(['admin:tokens', 'admin:stats', `tokens:${token.user}`, `dashboard:${token.user}`, `user:${token.user}`])

		return { revoked: true }
	}
}
