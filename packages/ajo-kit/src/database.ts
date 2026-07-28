import { createRequire } from 'node:module'
import { Kysely, SqliteDialect } from 'kysely'
import type * as BetterSqlite3 from 'better-sqlite3'

// Anchored on this module's own location, not on resolving the package by
// name. A built App bundles the kit and does not install it — the shape the
// kit's own runtime closure encourages — and there `import.meta.resolve`
// throws ERR_MODULE_NOT_FOUND before anything else can run, so the server
// dies on its first line while every test stays green. Resolving from here
// walks up to whichever node_modules actually holds the driver, which is
// correct in the workspace and in a container alike.
const require = createRequire(import.meta.url)

/** Kysely SQL template helper. */
export { sql } from 'kysely'
/** Kysely database and row helper types. */
export type { Kysely, Generated, Selectable, Insertable } from 'kysely'
/** better-sqlite3 constructor resolved from wherever the driver is installed. */
export const Database = require('better-sqlite3') as typeof import('better-sqlite3')
/** better-sqlite3 database handle type. */
export type Database = BetterSqlite3.Database
/** Alias for the active SQLite database handle. */
export type Sqlite = Database

let sqlite: Sqlite | null = null
let instance: Kysely<any> | null = null

/** Opens the SQLite database and configures safe defaults. */
export function connect(path = './database.sqlite'): Sqlite {
	sqlite = new Database(path)
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
