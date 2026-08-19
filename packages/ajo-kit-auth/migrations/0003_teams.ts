import { sql, type Kysely } from 'ajo-kit/database'

export async function up(db: Kysely<any>): Promise<void> {

	await db.schema
		.createTable('teams')
		.addColumn('id', 'integer', c => c.primaryKey())
		.addColumn('name', 'text', c => c.notNull().unique())
		.addColumn('created', 'text', c => c.defaultTo(sql`CURRENT_TIMESTAMP`))
		.addColumn('updated', 'text')
		.execute()

	await db.schema
		.createTable('teammates')
		.addColumn('team', 'integer', c => c.notNull().references('teams.id').onDelete('cascade'))
		.addColumn('user', 'integer', c => c.notNull().references('users.id').onDelete('cascade'))
		.addColumn('role', 'integer', c => c.notNull().references('roles.id'))
		.addColumn('created', 'text', c => c.defaultTo(sql`CURRENT_TIMESTAMP`))
		.addPrimaryKeyConstraint('teammates_pk', ['team', 'user'])
		.execute()

	await db.schema
		.createTable('claims')
		.addColumn('team', 'integer', c => c.notNull().references('teams.id').onDelete('cascade'))
		.addColumn('subject', 'text', c => c.notNull())
		.addColumn('created', 'text', c => c.defaultTo(sql`CURRENT_TIMESTAMP`))
		.addPrimaryKeyConstraint('claims_pk', ['team', 'subject'])
		.execute()

	await db.schema.createIndex('idx_teammates_user').on('teammates').column('user').execute()
	await db.schema.createIndex('idx_teammates_role').on('teammates').column('role').execute()
	await db.schema.createIndex('idx_claims_subject').on('claims').column('subject').execute()
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('claims').execute()
	await db.schema.dropTable('teammates').execute()
	await db.schema.dropTable('teams').execute()
}
