import type { Request } from '@kit'
import { db } from '/src/data'
import { sql } from '@kit/database'
import { emit } from '@kit/server'
import { Missing } from '@kit'

type LoadDirection = 'older' | 'newer'

const LIMIT = 10

const now = () => sql<string>`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`

function listMessages(
	chat: number,
	{ before, after, limit = LIMIT }: { before?: number; after?: number; limit?: number } = {}
) {

	const base = db()
		.selectFrom('messages')
		.innerJoin('users', 'users.id', 'messages.user')
		.where('messages.chat', '=', chat)
		.select([
			'messages.id',
			'messages.text',
			sql<string>`strftime('%Y-%m-%dT%H:%M:%fZ', messages.created)`.as('created'),
			'users.id as user',
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

async function unreadMeta(chat: number, user: number) {

	const participant = await db()
		.selectFrom('participants')
		.where('chat', '=', chat)
		.where('user', '=', user)
		.select('seen')
		.executeTakeFirst()

	let query = db()
		.selectFrom('messages')
		.where('messages.chat', '=', chat)
		.where('messages.user', '!=', user)

	if (participant?.seen) {
		query = query.where('messages.created', '>', participant.seen)
	}

	const meta = await query
		.select(eb => [
			eb.fn.countAll<number>().as('count'),
			eb.fn.min<number>('messages.id').as('oldest')
		])
		.executeTakeFirst()

	return {
		unreadCount: Number(meta?.count ?? 0),
		oldestUnreadId: meta?.oldest ?? null
	}
}

export async function page(req: Request) {

	const room = Number(req.params.id)
	const user = req.user!.id

	req.track?.([`chat:${room}`, `user:${user}`])

	const chat = await db()
		.selectFrom('chats')
		.where('id', '=', room)
		.select(['id', 'name'])
		.executeTakeFirst()

	if (!chat) throw new Missing('Chat not found')

	const [participants, messages, meta] = await Promise.all([
		db()
			.selectFrom('participants')
			.innerJoin('users', 'users.id', 'participants.user')
			.where('participants.chat', '=', room)
			.select(['users.id', 'users.name'])
			.execute(),
		listMessages(room),
		unreadMeta(room, user)
	])

	return {
		chat,
		participants,
		messages,
		hasMore: messages.length === LIMIT,
		me: user,
		...meta
	}
}

export const actions = {

	send: async (req: Request) => {

		const room = Number(req.params.id)
		const user = req.user!.id
		const { text } = req.body as { text: string }

		if (!text?.trim()) throw new Error('Message cannot be empty')

		const result = await db().transaction().execute(async trx => {
			const inserted = await trx
				.insertInto('messages')
				.values({
					chat: room,
					user: user,
					text: text.trim(),
					created: now()
				})
				.returning('id')
				.executeTakeFirstOrThrow()

			const participants = await trx
				.selectFrom('participants')
				.where('chat', '=', room)
				.select('user')
				.execute()

			const message = await trx
				.selectFrom('messages')
				.innerJoin('users', 'users.id', 'messages.user')
				.where('messages.id', '=', inserted.id)
				.select([
					'messages.id',
					'messages.text',
					sql<string>`strftime('%Y-%m-%dT%H:%M:%fZ', messages.created)`.as('created'),
					'users.id as user',
					'users.name as userName'
				])
				.executeTakeFirstOrThrow()

			return { message, participants }
		})

		emit([
			`chat:${room}`,
			...result.participants.map(p => `chats:${p.user}`),
			...result.participants.map(p => `user:${p.user}`),
		])

		return { ok: true, message: result.message }
	},

	load: async (req: Request) => {

		const room = Number(req.params.id)
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
			room,
			direction === 'older' ? { before: cursor } : { after: cursor }
		)

		return {
			messages,
			hasMore: messages.length === LIMIT
		}
	},

	markAsSeen: async (req: Request) => {

		const room = Number(req.params.id)
		const user = req.user!.id

		await db()
			.updateTable('participants')
			.set({ seen: now() })
			.where('chat', '=', room)
			.where('user', '=', user)
			.execute()

		emit([`user:${user}`, `chats:${user}`])

		return { ok: true }
	}
}
