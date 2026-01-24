import { Kysely, SqliteDialect } from 'kysely'
import Database from 'better-sqlite3'
import type { DB } from './types'

let instance: Kysely<DB> | null = null

export function db(): Kysely<DB> {
	return instance ??= new Kysely<DB>({
		dialect: new SqliteDialect({
			database: new Database('./database.sqlite')
		})
	})
}

export async function close(): Promise<void> {
	if (instance) {
		await instance.destroy()
		instance = null
	}
}
