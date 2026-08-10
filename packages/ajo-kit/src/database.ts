import type { Kysely } from 'kysely'

export { sql } from 'kysely'
export type { Kysely, Generated, Selectable, Insertable } from 'kysely'

/** Opens the shared SQLite database at the given path. */
export declare function connect(path?: string): void

/** Returns the shared Kysely instance, opening SQLite on first use. */
export declare function db<T = any>(): Kysely<T>

/** Destroys the shared Kysely instance and closes SQLite. */
export declare function close(): Promise<void>
