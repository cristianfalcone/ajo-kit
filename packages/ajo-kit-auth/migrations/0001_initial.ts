import { sql, type Kysely } from 'ajo-kit/database'

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
		.addColumn('last', 'text')
		.execute()

	await db.schema
		.createTable('roles')
		.addColumn('id', 'integer', c => c.primaryKey())
		.addColumn('name', 'text', c => c.notNull().unique())
		.addColumn('abilities', 'text', c => c.notNull().defaultTo('[]'))
		.execute()

	await db.schema
		.createTable('members')
		.addColumn('user', 'integer', c => c.notNull().references('users.id').onDelete('cascade'))
		.addColumn('role', 'integer', c => c.notNull().references('roles.id').onDelete('cascade'))
		.execute()

	await db.schema
		.createTable('resets')
		.addColumn('id', 'text', c => c.primaryKey())
		.addColumn('user', 'integer', c => c.notNull().references('users.id').onDelete('cascade'))
		.addColumn('expiry', 'text', c => c.notNull())
		.addColumn('created', 'text', c => c.defaultTo(sql`CURRENT_TIMESTAMP`))
		.execute()

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

	await db.schema.createIndex('idx_resets_user').on('resets').column('user').execute()
	await db.schema.createIndex('idx_tokens_user').on('tokens').column('user').execute()
	await db.schema.createIndex('idx_sessions_user_created').on('sessions').columns(['user', 'created']).execute()
	await db.schema.createIndex('idx_sessions_created').on('sessions').column('created').execute()
	await db.schema.createIndex('idx_sessions_user_last').on('sessions').columns(['user', 'last']).execute()
	await db.schema.createIndex('idx_members_user').on('members').column('user').execute()
	await db.schema.createIndex('idx_members_role').on('members').column('role').execute()
	await db.schema.createIndex('idx_users_created').on('users').column('created').execute()
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('tokens').execute()
	await db.schema.dropTable('resets').execute()
	await db.schema.dropTable('members').execute()
	await db.schema.dropTable('sessions').execute()
	await db.schema.dropTable('roles').execute()
	await db.schema.dropTable('users').execute()
}
