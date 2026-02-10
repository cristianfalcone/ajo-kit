import type { Request, Response } from '@kit'
import { send } from '@kit/server'
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
