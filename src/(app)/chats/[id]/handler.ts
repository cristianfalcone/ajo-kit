import type { Request } from 'polka'
import { db } from '/src/data'
import { emit } from '/src/server'
import { NotFoundError, ForbiddenError } from '/src/constants'

export const deps = ['chats', 'participants', 'messages', ':user']

// Verify user is participant
async function verify(req: Request) {

	const chatId = Number(req.params.id)

	const participant = await db()
		.selectFrom('participants')
		.where('chat', '=', chatId)
		.where('user', '=', req.user!.id)
		.select('user')
		.executeTakeFirst()

	if (!participant) throw new ForbiddenError('Not a participant')

	return chatId
}

export async function page(req: Request) {

	const chatId = await verify(req)

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

	return { chat, participants, messages, me: req.user!.id }
}

// Events - real-time updates
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

		return { messages }
	}
}

// Actions
export const actions = {

	send: async (req: Request) => {

		const chatId = await verify(req)
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

		// Emit to all clients viewing this chat
		emit('messages', { id: String(chatId) })

		return { ok: true }
	}
}
