import type { Request } from 'polka'
import { db } from '/src/data'
import { sql } from 'kysely'

export const deps = ['chats', 'participants', 'messages', ':user']

export async function page(req: Request) {

	// Get chats for current user with last message and other participants
	const chats = await db()
		.selectFrom('chats')
		.innerJoin('participants', 'participants.chat', 'chats.id')
		.where('participants.user', '=', req.user!.id)
		.select([
			'chats.id',
			'chats.name',
			'chats.created',
			// Subquery: other participants' names (for direct chats)
			db()
				.selectFrom('participants as p')
				.innerJoin('users', 'users.id', 'p.user')
				.whereRef('p.chat', '=', 'chats.id')
				.where('p.user', '!=', req.user!.id)
				.select(sql<string>`group_concat(users.name, ', ')`.as('names'))
				.as('others'),
			// Subquery: last message
			db()
				.selectFrom('messages')
				.whereRef('messages.chat', '=', 'chats.id')
				.orderBy('messages.created', 'desc')
				.limit(1)
				.select('messages.text')
				.as('last'),
		])
		.orderBy('chats.created', 'desc')
		.execute()

	// Get all users for starting new chats (exclude self)
	const users = await db()
		.selectFrom('users')
		.select(['id', 'name'])
		.where('id', '!=', req.user!.id)
		.orderBy('name')
		.execute()

	return { chats, users }
}

export const actions = {

	// Start a new chat (direct or group)
	start: async (req: Request) => {

		const { users: raw, name } = req.body as { users: string; name?: string }
		const users = JSON.parse(raw || '[]') as number[]

		if (!users?.length) throw new Error('Select at least one user')

		// Check if direct chat already exists
		if (users.length === 1 && !name) {

			const existing = await db()
				.selectFrom('chats')
				.innerJoin('participants as p1', 'p1.chat', 'chats.id')
				.innerJoin('participants as p2', 'p2.chat', 'chats.id')
				.where('chats.name', 'is', null)
				.where('p1.user', '=', req.user!.id)
				.where('p2.user', '=', users[0])
				.select('chats.id')
				.executeTakeFirst()

			if (existing) return { redirect: `/chats/${existing.id}` }
		}

		// Create new chat
		const chat = await db()
			.insertInto('chats')
			.values({ name: name || null })
			.returning('id')
			.executeTakeFirstOrThrow()

		// Add participants (self + selected users)
		await db()
			.insertInto('participants')
			.values([
				{ chat: chat.id, user: req.user!.id },
				...users.map(user => ({ chat: chat.id, user }))
			])
			.execute()

		return { redirect: `/chats/${chat.id}` }
	}
}
