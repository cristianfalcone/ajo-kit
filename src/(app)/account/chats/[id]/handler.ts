import type { Request } from '@kit'
import { db } from '/src/data'
import { sql } from '@kit/database'
import { emit } from '@kit/server'
import { NotFoundError } from '@kit'

const LIMIT = 50

function recent(chatId: number, before?: number, limit = LIMIT) {

	let query = db()
		.selectFrom('messages')
		.innerJoin('users', 'users.id', 'messages.user')
		.where('messages.chat', '=', chatId)
		.select(['messages.id', 'messages.text', 'messages.created', 'users.id as userId', 'users.name as userName'])
		.orderBy('messages.id', 'desc')
		.limit(limit)

	if (before) query = query.where('messages.id', '<', before)

	return query.execute().then(rows => rows.reverse())
}

export async function page(req: Request) {

	const chatId = Number(req.params.id)

	req.track?.(`chat:${chatId}`)

	const limit = Number(new URL(req.url, `http://${req.headers.host}`).searchParams.get('limit')) || LIMIT

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

	const messages = await recent(chatId, undefined, limit)

	await db()
		.updateTable('participants')
		.set({ seen: sql`CURRENT_TIMESTAMP` })
		.where('chat', '=', chatId)
		.where('user', '=', req.user!.id)
		.execute()

	return { chat, participants, messages, hasMore: messages.length === limit, me: req.user!.id }
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

		const participants = await db()
			.selectFrom('participants')
			.where('chat', '=', chatId)
			.select('user')
			.execute()

		emit([
			`chat:${chatId}`,
			...participants.map(p => `chats:${p.user}`),
			...participants.map(p => `user:${p.user}`),
		])

		return { ok: true }
	},

	markAsSeen: async (req: Request) => {

		const chatId = Number(req.params.id)

		await db()
			.updateTable('participants')
			.set({ seen: sql`CURRENT_TIMESTAMP` })
			.where('chat', '=', chatId)
			.where('user', '=', req.user!.id)
			.execute()

		emit(`user:${req.user!.id}`)

		return { ok: true }
	}
}
