import * as auth from 'ajo-kit-auth'
import type { ActionContext, Request, Response } from 'ajo-kit'
import { object, string, parse } from 'ajo-kit/validate'
import { db } from '/src/data'
import { info, rows as trim, paginate } from '/src/data/pagination'

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
			abilities: JSON.parse(t.abilities)
		})),
		page: info(req, pagination, tokens),
	}
}
export const actions = {
	default: async (req: Request, _res: Response, action: ActionContext) => {
		const input = parse(Revoke, req.body)

		const token = await db()
			.selectFrom('tokens')
			.select(['id', 'user'])
			.where('id', '=', input.id)
			.executeTakeFirst()

		if (!token || !await auth.token.revoke(token.user, token.id)) return { revoked: false }

		action.emit(['admin:tokens', 'admin:stats', `tokens:${token.user}`, `dashboard:${token.user}`, `user:${token.user}`])

		return { revoked: true }
	}
}
