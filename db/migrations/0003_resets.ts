import { sql, type Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {

	await db.schema
		.createTable('resets')
		.addColumn('id', 'text', c => c.primaryKey())
		.addColumn('user', 'integer', c => c.notNull().references('users.id').onDelete('cascade'))
		.addColumn('expiry', 'text', c => c.notNull())
		.addColumn('created', 'text', c => c.defaultTo(sql`CURRENT_TIMESTAMP`))
		.execute()

	await db.schema
		.createIndex('idx_resets_user')
		.on('resets')
		.column('user')
		.execute()
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('resets').execute()
}
