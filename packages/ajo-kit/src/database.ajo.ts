import app from 'runtime:app'
import open from 'runtime:sqlite'
import { Kysely, SqliteDialect } from 'kysely'
import { resolveDatabasePath } from './database-path'

/** Kysely SQL template helper. */
export { sql } from 'kysely'
/** Kysely database and row helper types (the full ./database contract). */
export type { Kysely, Generated, Selectable, Insertable } from 'kysely'

let sqlite: ReturnType<typeof open> | null = null
let instance: Kysely<any> | null = null

/** Opens the shared SQLite database beneath the runtime application data root. */
export function connect(path = './database.sqlite'): void {
	// runtime:sqlite applies busy_timeout, foreign_keys, WAL, and synchronous
	// defaults while opening the handle; see ajo-js/host/sqlite.c.
	sqlite = open(resolveDatabasePath(path, app.data))
}

/** Returns the shared Kysely instance, opening SQLite on first use. */
export function db<T = any>(): Kysely<T> {
	if (!sqlite) connect()
	return instance ??= new Kysely<T>({
		dialect: new SqliteDialect({ database: sqlite! })
	})
}

/** Destroys the shared Kysely instance and closes SQLite. */
export async function close(): Promise<void> {
	const current = instance
	const database = sqlite
	instance = null
	sqlite = null

	try {
		if (current) await current.destroy()
	} finally {
		database?.close()
	}
}
