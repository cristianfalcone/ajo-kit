import type { Request, Response } from 'polka'
import send from '@polka/send'
import { db } from '/src/data'

export default {

	async get(req: Request, res: Response) {

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
