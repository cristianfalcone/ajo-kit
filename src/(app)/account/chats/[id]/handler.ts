import type { Request } from '@kit'
import { db } from '/src/data'
import { sql } from '@kit/database'
import { emit, hush } from '@kit/server'
import { NotFoundError } from '@kit'

const LIMIT = 50

function recent(chatId: number, before?: number, limit = LIMIT) {

	let q = db()
		.selectFrom('messages')
		.innerJoin('users', 'users.id', 'messages.user')
		.where('messages.chat', '=', chatId)
		.select(['messages.id', 'messages.text', 'messages.created', 'users.id as userId', 'users.name as userName'])
		.orderBy('messages.id', 'desc')
		.limit(limit)

	if (before) q = q.where('messages.id', '<', before)

	return q.execute().then(rows => rows.reverse())
}

export async function page(req: Request) {

	const chatId = Number(req.params.id)

	const chat = await db()
		.selectFrom('chats')
		.where('id', '=', chatId)
		.select(['id', 'name'])
		.executeTakeFirst()

	if (!chat) throw new NotFoundError('Chat not found')

	const participants = await db()
		.selectFrom('participants')
		.innerJoin('users', 'users.id', 'participants.user')
		.where('participants.chat', '=', chatId)
		.select(['users.id', 'users.name'])
		.execute()

	const messages = await recent(chatId)

	await db()
		.updateTable('participants')
		.set({ seen: sql`CURRENT_TIMESTAMP` })
		.where('chat', '=', chatId)
		.where('user', '=', req.user!.id)
		.execute()

	return { chat, participants, messages, hasMore: messages.length === LIMIT, me: req.user!.id }
}

export const events = {

	messages: async (req: Request) => {

		const chatId = Number(req.params.id)
		const latest = await recent(chatId, undefined, 5)

		// Mark seen — participants bump defers until delivery completes, then triggers status
		await db()
			.updateTable('participants')
			.set({ seen: sql`CURRENT_TIMESTAMP` })
			.where('chat', '=', chatId)
			.where('user', '=', req.user!.id)
			.execute()

		return { latest }
	}
}

export const actions = {

	send: async (req: Request) => {

		const chatId = Number(req.params.id)
		const { text } = req.body as { text: string }

		if (!text?.trim()) throw new Error('Message cannot be empty')

		await hush(
			() => db()
				.insertInto('messages')
				.values({
					chat: chatId,
					user: req.user!.id,
					text: text.trim()
				})
				.execute()
		)

		emit('messages', { id: String(chatId) })

		return { ok: true }
	},

	older: async (req: Request) => {

		const chatId = Number(req.params.id)
		const { cursor } = req.body as { cursor: number }
		const messages = await recent(chatId, cursor)

		return { messages, hasMore: messages.length === LIMIT }
	}
}
