import type { Kysely } from 'ajo-kit/database'

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.alterTable('sessions')
		.addColumn('last', 'text')
		.execute()
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema
		.alterTable('sessions')
		.dropColumn('last')
		.execute()
}
