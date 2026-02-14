import { Kysely, SqliteDialect } from 'kysely'
import BetterSqlite, { type Database as BetterSqliteDatabase } from 'better-sqlite3'

export { sql } from 'kysely'
export type { Kysely, Generated, Selectable, Insertable } from 'kysely'
export { default as Database } from 'better-sqlite3'
export type Sqlite = BetterSqliteDatabase

let sqlite: BetterSqliteDatabase | null = null
let instance: Kysely<any> | null = null

export function connect(path = './database.sqlite'): BetterSqliteDatabase {
	sqlite = new BetterSqlite(path)
	sqlite.pragma('journal_mode = WAL')
	return sqlite
}

export function db<T = any>(): Kysely<T> {
	if (!sqlite) connect()
	return instance ??= new Kysely<T>({
		dialect: new SqliteDialect({ database: sqlite! })
	})
}

export function raw(): BetterSqliteDatabase {
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
