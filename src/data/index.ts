import { connect, db as base, sql } from '@kit/database'
import type { DB } from './types'

connect('./database.sqlite')

export const db = () => base<DB>()

export const unread = (userId: number, excludeChatId?: number) => {
	let query = db()
		.selectFrom('messages')
		.innerJoin('participants', 'participants.chat', 'messages.chat')
		.where('participants.user', '=', userId)
		.where('messages.user', '!=', userId)
		.where((eb) => eb.or([
			eb('participants.seen', 'is', null),
			eb(sql`julianday(messages.created)`, '>', sql`julianday(participants.seen)`)
		]))

	if (excludeChatId) query = query.where('messages.chat', '!=', excludeChatId)

	return query
		.select(db().fn.countAll().as('count'))
		.executeTakeFirst()
		.then(row => Number(row?.count ?? 0))
}

export * from './fields'
