import type { Request } from '@kit'
import { sql } from '@kit/database'
import { emit } from '@kit/server'
import { db } from '/src/data'

const listChats = (user: number) => db()
	.selectFrom('chats')
	.innerJoin('participants', 'participants.chat', 'chats.id')
	.where('participants.user', '=', user)
	.select((eb) => [
		'chats.id',
		'chats.name',
		'chats.created',
		eb.selectFrom('participants as p')
			.innerJoin('users', 'users.id', 'p.user')
			.whereRef('p.chat', '=', 'chats.id')
			.where('p.user', '!=', user)
			.select(sql<string>`group_concat(users.name, ', ')`.as('names'))
			.as('others'),
		eb.selectFrom('messages')
			.whereRef('messages.chat', '=', 'chats.id')
			.orderBy('messages.id', 'desc')
			.limit(1)
			.select('messages.text')
			.as('last'),
		eb.selectFrom('messages')
			.whereRef('messages.chat', '=', 'chats.id')
			.orderBy('messages.id', 'desc')
			.limit(1)
			.select(sql<string>`strftime('%Y-%m-%dT%H:%M:%fZ', messages.created)`.as('created'))
			.as('lastAt'),
		eb.selectFrom('messages')
			.whereRef('messages.chat', '=', 'chats.id')
			.where('messages.user', '!=', user)
			.where((qb) => qb.or([
				qb('participants.seen', 'is', null),
				qb('messages.created', '>', qb.ref('participants.seen'))
			]))
			.select(eb.fn.countAll<number>().as('count'))
			.as('unread'),
	])
	.orderBy(sql<string>`coalesce((select max(messages.created) from messages where messages.chat = chats.id), chats.created)`, 'desc')
	.execute()

const listUsers = (user: number) => db()
	.selectFrom('users')
	.select(['id', 'name'])
	.where('id', '!=', user)
	.orderBy('name')
	.execute()

export async function layout(req: Request) {

	req.track?.([`chats:${req.user!.id}`, `user:${req.user!.id}`, 'users:list'])

	const [chats, users] = await Promise.all([
		listChats(req.user!.id),
		listUsers(req.user!.id)
	])

	return { chats, users }
}

export const actions = {

	start: async (req: Request) => {

		const { users: raw, name } = req.body as { users: string; name?: string }
		const users = JSON.parse(raw || '[]') as number[]

		if (!users?.length) throw new Error('Select at least one user')

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
					'=',
					2
				))
				.select('chats.id')
				.executeTakeFirst()

			if (existing) return { redirect: `/account/chats/${existing.id}` }
		}

		const participants = [req.user!.id, ...users]
		const chat = await db().transaction().execute(async trx => {
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
			`chat:${chat}`,
			...participants.map(user => `chats:${user}`),
			...participants.map(user => `user:${user}`)
		])

		return { redirect: `/account/chats/${chat}` }
	}
}
