import type { Kysely } from 'ajo-kit/database'

export async function up(db: Kysely<any>): Promise<void> {

	await db.schema
		.createTable('invites')
		.addColumn('id', 'text', c => c.primaryKey())
		.addColumn('email', 'text')
		.addColumn('name', 'text', c => c.notNull().defaultTo(''))
		.addColumn('role', 'text', c => c.notNull())
		.addColumn('team', 'integer')
		.addColumn('inviter', 'integer', c => c.references('users.id').onDelete('set null'))
		.addColumn('expiry', 'text', c => c.notNull())
		.addColumn('accepted', 'text')
		.addColumn('acceptor', 'integer', c => c.references('users.id').onDelete('set null'))
		.addColumn('revoked', 'text')
		.execute()

	await db.schema.createIndex('idx_invites_email').on('invites').column('email').execute()
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('invites').execute()
}
