import type { Request } from 'polka'
import { db } from '/src/data'
import { sql } from 'kysely'
import { emit } from '/src/server'
import { NotFoundError } from '/src/constants'

export async function page(req: Request) {

	const chatId = Number(req.params.id)

	const chat = await db()
		.selectFrom('chats')
		.where('id', '=', chatId)
		.select(['id', 'name'])
		.executeTakeFirst()

	if (!chat) throw new NotFoundError('Chat not found')

	// Get participants with names
	const participants = await db()
		.selectFrom('participants')
		.innerJoin('users', 'users.id', 'participants.user')
		.where('participants.chat', '=', chatId)
		.select(['users.id', 'users.name'])
		.execute()

	// Get messages (last 50)
	const messages = await db()
		.selectFrom('messages')
		.innerJoin('users', 'users.id', 'messages.user')
		.where('messages.chat', '=', chatId)
		.select(['messages.id', 'messages.text', 'messages.created', 'users.id as userId', 'users.name as userName'])
		.orderBy('messages.created', 'desc')
		.limit(50)
		.execute()
		.then(rows => rows.reverse())

	// Mark chat as seen
	await db()
		.updateTable('participants')
		.set({ seen: sql`CURRENT_TIMESTAMP` })
		.where('chat', '=', chatId)
		.where('user', '=', req.user!.id)
		.execute()

	return { chat, participants, messages, me: req.user!.id }
}

export const events = {

	messages: async (req: Request) => {

		const chatId = Number(req.params.id)

		const messages = await db()
			.selectFrom('messages')
			.innerJoin('users', 'users.id', 'messages.user')
			.where('messages.chat', '=', chatId)
			.select(['messages.id', 'messages.text', 'messages.created', 'users.id as userId', 'users.name as userName'])
			.orderBy('messages.created', 'desc')
			.limit(50)
			.execute()
			.then(rows => rows.reverse())

		// Mark as seen while viewing
		await db()
			.updateTable('participants')
			.set({ seen: sql`CURRENT_TIMESTAMP` })
			.where('chat', '=', chatId)
			.where('user', '=', req.user!.id)
			.execute()

		return { messages }
	}
}

export const actions = {

	send: async (req: Request) => {

		const chatId = Number(req.params.id)
		const { text } = req.body as { text: string }

		if (!text?.trim()) throw new Error('Message cannot be empty')

		await db()
			.insertInto('messages')
			.values({
				chat: chatId,
				user: req.user!.id,
				text: text.trim()
			})
			.execute()

		emit('messages', { id: String(chatId) })

		return { ok: true }
	}
}
