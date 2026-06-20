import { Kysely, SqliteDialect } from 'kysely'
import Sqlite from 'better-sqlite3'
import type * as BetterSqlite3 from 'better-sqlite3'

export { sql } from 'kysely'
export type { Kysely, Generated, Selectable, Insertable } from 'kysely'
export { default as Database } from 'better-sqlite3'
export type Database = BetterSqlite3.Database
export type Sqlite = Database

let sqlite: Sqlite | null = null
let instance: Kysely<any> | null = null

export function connect(path = './database.sqlite'): Sqlite {
	sqlite = new Sqlite(path)
	sqlite.pragma('journal_mode = WAL')
	sqlite.pragma('foreign_keys = ON')
	sqlite.pragma('busy_timeout = 5000')
	sqlite.pragma('synchronous = NORMAL')
	return sqlite
}

export function db<T = any>(): Kysely<T> {
	if (!sqlite) connect()
	return instance ??= new Kysely<T>({
		dialect: new SqliteDialect({ database: sqlite! })
	})
}

export function raw(): Sqlite {
	if (!sqlite) connect()
	return sqlite!
}

export async function close(): Promise<void> {
	if (instance) {
		await instance.destroy()
		instance = null
	}
	if (sqlite) {
		sqlite.close()
		sqlite = null
	}
}
