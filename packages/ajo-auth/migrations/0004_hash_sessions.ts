import type { Kysely } from 'ajo-kit/database'

export async function up(db: Kysely<any>): Promise<void> {
	await db.deleteFrom('sessions').execute()
}

export async function down(_: Kysely<any>): Promise<void> {
}
