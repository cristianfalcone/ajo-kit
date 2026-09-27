import * as auth from 'ajo-kit-auth'
import type { Request, Response } from 'ajo-kit'
import { send } from 'ajo-kit/server'
import { db } from '/src/data'

export default {

	async get(req: Request, res: Response) {

		auth.authorize(req, 'profile:read')

		const extra = await db()
			.selectFrom('users')
			.select(['verified', 'created'])
			.where('id', '=', req.user!.id)
			.executeTakeFirst()

		send(res, 200, {
			...req.user,
			...extra,
			abilities: req.token?.abilities || null
		})
	}
}
