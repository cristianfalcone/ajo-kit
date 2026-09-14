import type { Kysely } from 'ajo-kit/database'

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema.alterTable('tokens').addColumn('subject', 'text').execute()
}

export async function down(db: Kysely<any>): Promise<void> {
	// Removing the scope must never promote a scoped credential to global access.
	await db.deleteFrom('tokens').where('subject', 'is not', null).execute()
	await db.schema.alterTable('tokens').dropColumn('subject').execute()
}
