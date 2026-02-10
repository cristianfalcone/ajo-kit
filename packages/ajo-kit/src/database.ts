import { Kysely, SqliteDialect } from 'kysely'
import BetterSqlite from 'better-sqlite3'
import { TrackerPlugin } from './tracker'

export { sql } from 'kysely'
export type { Kysely, Generated, Selectable, Insertable } from 'kysely'
export { default as Database } from 'better-sqlite3'
export type Sqlite = BetterSqlite.Database

let sqlite: BetterSqlite.Database | null = null
let instance: Kysely<any> | null = null

export function connect(path = './database.sqlite'): BetterSqlite.Database {
	sqlite = new BetterSqlite(path)
	sqlite.pragma('journal_mode = WAL')
	return sqlite
}

export function db<T = any>(): Kysely<T> {
	if (!sqlite) connect()
	return instance ??= new Kysely<T>({
		dialect: new SqliteDialect({ database: sqlite! }),
		plugins: [new TrackerPlugin()]
	})
}

export function raw(): BetterSqlite.Database {
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
