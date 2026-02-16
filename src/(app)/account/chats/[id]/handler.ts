import type { Request } from '@kit'
import { db } from '/src/data'
import { sql } from '@kit/database'
import { emit } from '@kit/server'
import { NotFoundError } from '@kit'

type LoadDirection = 'older' | 'newer'

const LIMIT = 10

const now = () => sql<string>`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`

function listMessages(
	chatId: number,
	{ before, after, limit = LIMIT }: { before?: number; after?: number; limit?: number } = {}
) {

	const base = db()
		.selectFrom('messages')
		.innerJoin('users', 'users.id', 'messages.user')
		.where('messages.chat', '=', chatId)
		.select([
			'messages.id',
			'messages.text',
			sql<string>`strftime('%Y-%m-%dT%H:%M:%fZ', messages.created)`.as('created'),
			'users.id as userId',
			'users.name as userName'
		])

	if (before) {
		return base
			.where('messages.id', '<', before)
			.orderBy('messages.id', 'desc')
			.limit(limit)
			.execute()
			.then(rows => rows.reverse())
	}

	if (after) {
		return base
			.where('messages.id', '>', after)
			.orderBy('messages.id', 'asc')
			.limit(limit)
			.execute()
	}

	return base
		.orderBy('messages.id', 'desc')
		.limit(limit)
		.execute()
		.then(rows => rows.reverse())
}

async function unreadMeta(chatId: number, userId: number) {

	const participant = await db()
		.selectFrom('participants')
		.where('chat', '=', chatId)
		.where('user', '=', userId)
		.select('seen')
		.executeTakeFirst()

	let query = db()
		.selectFrom('messages')
		.where('messages.chat', '=', chatId)
		.where('messages.user', '!=', userId)

	if (participant?.seen) {
		query = query.where(sql`julianday(messages.created)`, '>', sql`julianday(${participant.seen})`)
	}

	const [count, oldest] = await Promise.all([
		query
			.select(eb => eb.fn.countAll<number>().as('count'))
			.executeTakeFirst(),
		query
			.select('messages.id')
			.orderBy('messages.id', 'asc')
			.limit(1)
			.executeTakeFirst(),
	])

	return {
		unreadCount: Number(count?.count ?? 0),
		oldestUnreadId: oldest?.id ?? null
	}
}

export async function page(req: Request) {

	const chatId = Number(req.params.id)
	const userId = req.user!.id

	req.track?.([`chat:${chatId}`, `user:${userId}`])

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

	const [messages, meta] = await Promise.all([
		listMessages(chatId),
		unreadMeta(chatId, userId)
	])

	return {
		chat,
		participants,
		messages,
		hasMore: messages.length === LIMIT,
		me: userId,
		...meta
	}
}

export const actions = {

	send: async (req: Request) => {

		const chatId = Number(req.params.id)
		const userId = req.user!.id
		const { text } = req.body as { text: string }

		if (!text?.trim()) throw new Error('Message cannot be empty')

		await db()
			.insertInto('messages')
			.values({
				chat: chatId,
				user: userId,
				text: text.trim(),
				created: now()
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

	load: async (req: Request) => {

		const chatId = Number(req.params.id)
		const body = (req.body as { cursor?: number | string; direction?: LoadDirection } | undefined) ?? {}
		const cursor = Number(body.cursor)
		const direction = body.direction

		if (!Number.isInteger(cursor) || cursor <= 0) {
			return { messages: [], hasMore: false }
		}

		if (direction !== 'older' && direction !== 'newer') {
			return { messages: [], hasMore: false }
		}

		const messages = await listMessages(
			chatId,
			direction === 'older' ? { before: cursor } : { after: cursor }
		)

		return {
			messages,
			hasMore: messages.length === LIMIT
		}
	},

	markAsSeen: async (req: Request) => {

		const chatId = Number(req.params.id)
		const userId = req.user!.id

		await db()
			.updateTable('participants')
			.set({ seen: now() })
			.where('chat', '=', chatId)
			.where('user', '=', userId)
			.execute()

		emit(`user:${userId}`)

		return { ok: true }
	}
}
