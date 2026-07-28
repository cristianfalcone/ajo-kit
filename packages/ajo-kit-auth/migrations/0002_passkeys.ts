import { sql, type Kysely } from 'ajo-kit/database'

export async function up(db: Kysely<any>): Promise<void> {

	// One row per registered authenticator. `id` is the credential id as the
	// browser reports it (base64url), which is what an assertion arrives
	// keyed by; `handle` is the opaque user handle the authenticator stores
	// and returns for a discoverable credential.
	await db.schema
		.createTable('credentials')
		.addColumn('id', 'text', c => c.primaryKey())
		.addColumn('user', 'integer', c => c.notNull().references('users.id').onDelete('cascade'))
		.addColumn('handle', 'text', c => c.notNull())
		.addColumn('key', 'text', c => c.notNull())
		.addColumn('alg', 'integer', c => c.notNull())
		.addColumn('counter', 'integer', c => c.notNull().defaultTo(0))
		.addColumn('transports', 'text')
		.addColumn('verified', 'text')
		.addColumn('eligible', 'integer', c => c.notNull().defaultTo(0))
		.addColumn('backed', 'integer', c => c.notNull().defaultTo(0))
		.addColumn('created', 'text', c => c.defaultTo(sql`CURRENT_TIMESTAMP`))
		.addColumn('last', 'text')
		.execute()

	// Challenges are rows rather than memory because a challenge must be
	// answerable exactly once, and a Map cannot promise that across a restart
	// or a second process. `user` is null for authentication, where the whole
	// point is that the server does not yet know who is answering.
	//
	// `handle` carries the user handle offered to the authenticator between
	// the two requests a registration takes. Regenerating it in the second
	// request instead would store a different handle than the authenticator
	// kept, and the credential would never be able to name its own account.
	await db.schema
		.createTable('challenges')
		.addColumn('id', 'text', c => c.primaryKey())
		.addColumn('kind', 'text', c => c.notNull())
		.addColumn('user', 'integer', c => c.references('users.id').onDelete('cascade'))
		.addColumn('handle', 'text')
		.addColumn('expiry', 'text', c => c.notNull())
		.addColumn('created', 'text', c => c.defaultTo(sql`CURRENT_TIMESTAMP`))
		.execute()

	await db.schema.createIndex('credentials_user').on('credentials').column('user').execute()
	await db.schema.createIndex('credentials_handle').on('credentials').column('handle').execute()
	await db.schema.createIndex('challenges_expiry').on('challenges').column('expiry').execute()
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropIndex('challenges_expiry').execute()
	await db.schema.dropIndex('credentials_handle').execute()
	await db.schema.dropIndex('credentials_user').execute()
	await db.schema.dropTable('challenges').execute()
	await db.schema.dropTable('credentials').execute()
}
