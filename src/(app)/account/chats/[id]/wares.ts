import type { Middleware } from '@kit'
import { Forbidden } from '@kit'
import { db } from '/src/data'

export default [
	async (req, _, next) => {

		const participant = await db()
			.selectFrom('participants')
			.where('chat', '=', Number(req.params.id))
			.where('user', '=', req.user!.id)
			.select('user')
			.executeTakeFirst()

		if (!participant) throw new Forbidden('Not a participant')

		next()
	}
] satisfies Middleware[]
