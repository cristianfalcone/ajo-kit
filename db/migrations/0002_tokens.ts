import { sql, type Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.createTable('tokens')
		.addColumn('id', 'text', c => c.primaryKey())
		.addColumn('user', 'integer', c => c.notNull().references('users.id').onDelete('cascade'))
		.addColumn('name', 'text', c => c.notNull())
		.addColumn('abilities', 'text', c => c.notNull().defaultTo('["*"]'))
		.addColumn('last', 'text')
		.addColumn('expiry', 'text')
		.addColumn('created', 'text', c => c.defaultTo(sql`CURRENT_TIMESTAMP`))
		.execute()

	await db.schema
		.createIndex('idx_tokens_user')
		.on('tokens')
		.column('user')
		.execute()
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('tokens').execute()
}
