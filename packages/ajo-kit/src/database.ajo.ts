import app from 'runtime:app'
import open from 'runtime:sqlite'
import { Kysely, SqliteDialect } from 'kysely'
import { resolveDatabasePath } from './database-path'

export { sql } from 'kysely'
export type { Kysely, Generated, Selectable, Insertable } from 'kysely'

let sqlite: ReturnType<typeof open> | null = null
let instance: Kysely<any> | null = null
let location: string | null = null

/** Opens the shared SQLite database beneath the runtime application data root. */
export function connect(path = './database.sqlite'): void {
	// runtime:sqlite applies busy_timeout, foreign_keys, WAL, and synchronous
	// defaults while opening the handle; see ajo-js/host/sqlite.c.
	const resolved = resolveDatabasePath(path, app.data)
	if (sqlite) {
		if (location === resolved) return
		throw new Error(`SQLite is already connected at ${location}`)
	}
	sqlite = open(resolved)
	location = resolved
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
	location = null

	// Close the native handle before the first await so runtime:app's
	// synchronous shutdown callbacks cannot leave SQLite open.
	database?.close()
	if (current) await current.destroy()
}
