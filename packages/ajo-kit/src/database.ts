import { Kysely, SqliteDialect } from 'kysely'
import Sqlite from 'better-sqlite3'
import type * as BetterSqlite3 from 'better-sqlite3'

/** Kysely SQL template helper. */
export { sql } from 'kysely'
/** Kysely database and row helper types. */
export type { Kysely, Generated, Selectable, Insertable } from 'kysely'
/** better-sqlite3 constructor for direct SQLite access. */
export { default as Database } from 'better-sqlite3'
/** better-sqlite3 database handle type. */
export type Database = BetterSqlite3.Database
/** Alias for the active SQLite database handle. */
export type Sqlite = Database

let sqlite: Sqlite | null = null
let instance: Kysely<any> | null = null

/** Opens the SQLite database and configures safe defaults. */
export function connect(path = './database.sqlite'): Sqlite {
	sqlite = new Sqlite(path)
	sqlite.pragma('journal_mode = WAL')
	sqlite.pragma('foreign_keys = ON')
	sqlite.pragma('busy_timeout = 5000')
	sqlite.pragma('synchronous = NORMAL')
	return sqlite
}

/** Returns the shared Kysely instance, opening SQLite on first use. */
export function db<T = any>(): Kysely<T> {
	if (!sqlite) connect()
	return instance ??= new Kysely<T>({
		dialect: new SqliteDialect({ database: sqlite! })
	})
}

/** Returns the shared raw better-sqlite3 handle. */
export function raw(): Sqlite {
	if (!sqlite) connect()
	return sqlite!
}

/** Destroys the shared Kysely instance and closes SQLite. */
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
