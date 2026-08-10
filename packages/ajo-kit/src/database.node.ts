// D19: Dev-time Node shim for Vite, Vitest, and CLI database operations.
import { createRequire } from 'node:module'
import { Kysely, SqliteDialect } from 'kysely'
import type * as BetterSqlite3 from 'better-sqlite3'

/** Kysely SQL template helper. */
export { sql } from 'kysely'
/** Kysely database and row helper types (the full ./database contract). */
export type { Kysely, Generated, Selectable, Insertable } from 'kysely'

const require = createRequire(import.meta.url)
const Database = require('better-sqlite3') as typeof import('better-sqlite3')
const maximum = BigInt(Number.MAX_SAFE_INTEGER)
const minimum = BigInt(Number.MIN_SAFE_INTEGER)

const integer = (value: unknown) =>
	typeof value === 'bigint' && value >= minimum && value <= maximum ? Number(value) : value

const row = (value: unknown): unknown => {
	if (!value || typeof value !== 'object' || value instanceof Uint8Array) return integer(value)
	return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, integer(entry)]))
}

const dialect = (database: BetterSqlite3.Database) => ({
	close: () => database.close(),
	prepare(query: string) {
		const statement = database.prepare(query).safeIntegers()
		const parameters = (values: ReadonlyArray<unknown>) => values as unknown[]

		return {
			reader: statement.reader,
			all: (values: ReadonlyArray<unknown>) => statement.all(parameters(values)).map(row),
			run(values: ReadonlyArray<unknown>) {
				const result = statement.run(parameters(values))
				return { ...result, lastInsertRowid: integer(result.lastInsertRowid) as number | bigint }
			},
			iterate(values: ReadonlyArray<unknown>) {
				const iterator = statement.iterate(parameters(values))
				return (function* () {
					for (const value of iterator) yield row(value)
				})()
			},
		}
	},
})

let sqlite: BetterSqlite3.Database | null = null
let instance: Kysely<any> | null = null
let location: string | null = null

/** Opens the shared SQLite database and configures safe defaults. */
export function connect(path = './database.sqlite'): void {
	if (sqlite) {
		if (location === path) return
		throw new Error(`SQLite is already connected at ${location}`)
	}
	sqlite = new Database(path)
	location = path
	sqlite.pragma('journal_mode = WAL')
	sqlite.pragma('foreign_keys = ON')
	sqlite.pragma('busy_timeout = 5000')
	sqlite.pragma('synchronous = NORMAL')
}

/** Returns the shared Kysely instance, opening SQLite on first use. */
export function db<T = any>(): Kysely<T> {
	if (!sqlite) connect()
	return instance ??= new Kysely<T>({
		dialect: new SqliteDialect({ database: dialect(sqlite!) })
	})
}

/** Destroys the shared Kysely instance and closes SQLite. */
export async function close(): Promise<void> {
	const current = instance
	const database = sqlite
	instance = null
	sqlite = null
	location = null

	try {
		if (current) await current.destroy()
	} finally {
		database?.close()
	}
}
