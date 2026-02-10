import { connect, db as base, close, sql } from '@kit/database'
import type { DB } from './types'

connect('./database.sqlite')

export const db = () => base<DB>()
export { close }

export const unread = (userId: number) => db()
	.selectFrom('messages')
	.innerJoin('participants', 'participants.chat', 'messages.chat')
	.where('participants.user', '=', userId)
	.where('messages.user', '!=', userId)
	.where((eb) => eb.or([
		eb('participants.seen', 'is', null),
		eb(sql`datetime(messages.created)`, '>', sql`datetime(participants.seen)`)
	]))
	.select(db().fn.countAll().as('count'))
	.executeTakeFirst()
	.then(row => Number(row?.count ?? 0))
