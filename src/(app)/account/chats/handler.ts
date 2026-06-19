import type { Request } from '@kit'
import { db } from '/src/data'
import { sql } from '@kit/database'
import { emit } from '@kit/server'

const chats = (userId: number) => db()
	.selectFrom('chats')
	.innerJoin('participants', 'participants.chat', 'chats.id')
	.where('participants.user', '=', userId)
	.select((eb) => [
		'chats.id',
		'chats.name',
		'chats.created',
		// Subquery: other participants' names (for direct chats)
		eb.selectFrom('participants as p')
			.innerJoin('users', 'users.id', 'p.user')
			.whereRef('p.chat', '=', 'chats.id')
			.where('p.user', '!=', userId)
			.select(sql<string>`group_concat(users.name, ', ')`.as('names'))
			.as('others'),
		// Subquery: last message
		eb.selectFrom('messages')
			.whereRef('messages.chat', '=', 'chats.id')
			.orderBy('messages.id', 'desc')
			.limit(1)
			.select('messages.text')
			.as('last'),
		// Subquery: unread count
		eb.selectFrom('messages')
			.whereRef('messages.chat', '=', 'chats.id')
			.where('messages.user', '!=', userId)
			.where((qb) => qb.or([
				qb('participants.seen', 'is', null),
				qb(sql`julianday(messages.created)`, '>', sql`julianday(participants.seen)`)
			]))
			.select(eb.fn.countAll<number>().as('count'))
			.as('unread'),
	])
	.orderBy('chats.created', 'desc')
	.execute()

export async function page(req: Request) {

	req.track?.([`chats:${req.user!.id}`, 'users:list'])

	const [chatList, users] = await Promise.all([
		chats(req.user!.id),
		db()
			.selectFrom('users')
			.select(['id', 'name'])
			.where('id', '!=', req.user!.id)
			.orderBy('name')
			.execute()
	])

	return { chats: chatList, users }
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
				.where((eb) => eb(
					eb.selectFrom('participants').whereRef('participants.chat', '=', 'chats.id').select(eb.fn.countAll().as('c')),
					'=', 2
				))
				.select('chats.id')
				.executeTakeFirst()

			if (existing) return { redirect: `/account/chats/${existing.id}` }
		}

		const participants = [req.user!.id, ...users]
		const chatId = await db().transaction().execute(async trx => {
			const chat = await trx
				.insertInto('chats')
				.values({ name: name || null })
				.returning('id')
				.executeTakeFirstOrThrow()

			await trx
				.insertInto('participants')
				.values(participants.map(user => ({ chat: chat.id, user })))
				.execute()

			return chat.id
		})

		emit([
			`chat:${chatId}`,
			...participants.map(user => `chats:${user}`),
			...participants.map(user => `user:${user}`)
		])

		return { redirect: `/account/chats/${chatId}` }
	}
}
