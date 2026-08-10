import { sql, type Kysely } from 'ajo-kit/database'
import type { Database } from '../../src/database'

export async function up(db: Kysely<Database>): Promise<void> {
	await db.schema
		.createTable('notes')
		.addColumn('id', 'integer', column => column.primaryKey())
		.addColumn('text', 'text', column => column.notNull())
		.addColumn('created', 'text', column => column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
		.execute()
}

export async function down(db: Kysely<Database>): Promise<void> {
	await db.schema.dropTable('notes').execute()
}
