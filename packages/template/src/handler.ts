import { Invalid, type ActionContext, type Request, type Response } from '@kit'
import { db } from '/src/database'

const topic = 'notes'

export async function page(req: Request) {
	req.track?.(topic)

	return {
		notes: await db()
			.selectFrom('notes')
			.select(['id', 'text', 'created'])
			.orderBy('id', 'desc')
			.limit(50)
			.execute(),
	}
}

export const actions = {
	add: async (req: Request, _res: Response, action: ActionContext) => {
		const text = typeof req.body?.text === 'string' ? req.body.text.trim() : ''

		if (!text || text.length > 160) {
			throw new Invalid({ text: ['Enter a note between 1 and 160 characters'] })
		}

		const note = await db()
			.insertInto('notes')
			.values({ text })
			.returning(['id', 'text', 'created'])
			.executeTakeFirstOrThrow()

		// Emitting after the awaited write prevents live readers from observing a
		// topic version whose durable row is not visible yet.
		action.emit(topic)

		return { note }
	},
}
