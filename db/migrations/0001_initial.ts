import { sql, type Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {

	await db.schema
		.createTable('users')
		.addColumn('id', 'integer', c => c.primaryKey())
		.addColumn('name', 'text', c => c.notNull().defaultTo(''))
		.addColumn('email', 'text', c => c.notNull().unique())
		.addColumn('password', 'text')
		.addColumn('verified', 'text')
		.addColumn('created', 'text', c => c.defaultTo(sql`CURRENT_TIMESTAMP`))
		.addColumn('updated', 'text')
		.execute()

	await db.schema
		.createTable('sessions')
		.addColumn('id', 'text', c => c.primaryKey())
		.addColumn('user', 'integer', c => c.notNull().references('users.id').onDelete('cascade'))
		.addColumn('expiry', 'text', c => c.notNull())
		.addColumn('ip', 'text')
		.addColumn('agent', 'text')
		.addColumn('created', 'text', c => c.defaultTo(sql`CURRENT_TIMESTAMP`))
		.execute()

	await db.schema
		.createTable('roles')
		.addColumn('id', 'integer', c => c.primaryKey())
		.addColumn('name', 'text', c => c.notNull().unique())
		.execute()

	await db.schema
		.createTable('members')
		.addColumn('user', 'integer', c => c.notNull().references('users.id').onDelete('cascade'))
		.addColumn('role', 'integer', c => c.notNull().references('roles.id').onDelete('cascade'))
		.execute()
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('members').execute()
	await db.schema.dropTable('sessions').execute()
	await db.schema.dropTable('roles').execute()
	await db.schema.dropTable('users').execute()
}
