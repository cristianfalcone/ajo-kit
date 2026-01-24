import { Kysely, SqliteDialect } from 'kysely'
import Database from 'better-sqlite3'
import type { DB } from './types'

export const database = new Database('./database.sqlite')
database.pragma('journal_mode = WAL')

let instance: Kysely<DB> | null = null

export function db(): Kysely<DB> {
	return instance ??= new Kysely<DB>({
		dialect: new SqliteDialect({ database })
	})
}

export async function close(): Promise<void> {
	if (instance) {
		await instance.destroy()
		instance = null
	}
}
