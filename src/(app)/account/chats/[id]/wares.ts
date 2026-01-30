import type { Middleware } from 'polka'
import { db } from '/src/data'
import { ForbiddenError } from '/src/constants'

export default [
	async (req, _, next) => {

		const participant = await db()
			.selectFrom('participants')
			.where('chat', '=', Number(req.params.id))
			.where('user', '=', req.user!.id)
			.select('user')
			.executeTakeFirst()

		if (!participant) throw new ForbiddenError('Not a participant')

		next()
	}
] satisfies Middleware[]
