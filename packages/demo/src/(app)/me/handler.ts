import * as auth from 'ajo-kit-auth'
import type { Request, Response } from 'ajo-kit'
import { send } from 'ajo-kit/server'
import { db } from '/src/data'

export default {

	async get(req: Request, res: Response) {

		auth.authorize(req, 'profile:read')

		const { created } = await db()
			.selectFrom('users')
			.select('created')
			.where('id', '=', req.user!.id)
			.executeTakeFirstOrThrow()

		send(res, 200, {
			...req.user,
			created,
			abilities: req.token?.abilities || null
		})
	}
}
