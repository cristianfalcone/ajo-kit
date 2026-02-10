import { Kysely, SqliteDialect, sql } from 'kysely'
import Database from 'better-sqlite3'
import { TrackerPlugin } from '@kit/tracker'
import type { DB } from './types'

export const database = new Database('./database.sqlite')

database.pragma('journal_mode = WAL')

let instance: Kysely<DB> | null = null

export function db(): Kysely<DB> {
	return instance ??= new Kysely<DB>({
		dialect: new SqliteDialect({ database }),
		plugins: [new TrackerPlugin()]
	})
}

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

export async function close(): Promise<void> {
	if (instance) {
		await instance.destroy()
		instance = null
	}
}
