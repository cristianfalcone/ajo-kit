import { sql, type Kysely } from 'ajo-kit/database'

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.createTable('registration')
		.addColumn('id', 'integer', c => c.primaryKey())
		.addColumn('signup', 'text', c => c.notNull().defaultTo('open'))
		.addColumn('updated', 'text')
		.addColumn('updater', 'integer', c => c.references('users.id').onDelete('set null'))
		.addCheckConstraint('registration_singleton', sql`id = 1`)
		.addCheckConstraint('registration_signup', sql`signup in ('open', 'invite')`)
		.execute()

	await db
		.insertInto('registration')
		.values({ id: 1, signup: 'open' })
		.execute()

	await db.schema
		.createTable('invitations')
		.addColumn('id', 'text', c => c.primaryKey())
		.addColumn('email', 'text', c => c.notNull())
		.addColumn('name', 'text', c => c.notNull().defaultTo(''))
		.addColumn('inviter', 'integer', c => c.references('users.id').onDelete('set null'))
		.addColumn('expiry', 'text', c => c.notNull())
		.addColumn('accepted', 'text')
		.addColumn('acceptor', 'integer', c => c.references('users.id').onDelete('set null'))
		.addColumn('revoked', 'text')
		.addColumn('created', 'text', c => c.defaultTo(sql`CURRENT_TIMESTAMP`))
		.execute()

	await db.schema.createIndex('idx_invitations_email').on('invitations').column('email').execute()
	await db.schema.createIndex('idx_invitations_created').on('invitations').column('created').execute()
	await db.schema.createIndex('idx_invitations_expiry').on('invitations').column('expiry').execute()
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropIndex('idx_invitations_expiry').execute()
	await db.schema.dropIndex('idx_invitations_created').execute()
	await db.schema.dropIndex('idx_invitations_email').execute()
	await db.schema.dropTable('invitations').execute()
	await db.schema.dropTable('registration').execute()
}
