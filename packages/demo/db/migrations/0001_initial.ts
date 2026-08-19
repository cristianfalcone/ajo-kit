import { sql, type Kysely } from 'ajo-kit/database'

export async function up(db: Kysely<any>): Promise<void> {

	// Chats: direct (2 members) or group (name + multiple members)
	await db.schema
		.createTable('chats')
		.addColumn('id', 'integer', c => c.primaryKey())
		.addColumn('name', 'text') // null for direct chats
		.addColumn('created', 'text', c => c.defaultTo(sql`CURRENT_TIMESTAMP`))
		.execute()

	// Participants
	await db.schema
		.createTable('participants')
		.addColumn('chat', 'integer', c => c.notNull().references('chats.id').onDelete('cascade'))
		.addColumn('user', 'integer', c => c.notNull().references('users.id').onDelete('cascade'))
		.addColumn('joined', 'text', c => c.defaultTo(sql`CURRENT_TIMESTAMP`))
		.addColumn('seen', 'text')
		.addPrimaryKeyConstraint('participants_pk', ['chat', 'user'])
		.execute()

	// Messages
	await db.schema
		.createTable('messages')
		.addColumn('id', 'integer', c => c.primaryKey())
		.addColumn('chat', 'integer', c => c.notNull().references('chats.id').onDelete('cascade'))
		.addColumn('user', 'integer', c => c.notNull().references('users.id').onDelete('cascade'))
		.addColumn('text', 'text', c => c.notNull())
		.addColumn('created', 'text', c => c.defaultTo(sql`CURRENT_TIMESTAMP`))
		.execute()

	await db.schema.createIndex('idx_participants_user_chat').on('participants').columns(['user', 'chat']).execute()
	await db.schema.createIndex('idx_messages_chat_id').on('messages').columns(['chat', 'id']).execute()
	await db.schema.createIndex('idx_messages_chat_created').on('messages').columns(['chat', 'created']).execute()

	await db.schema
		.createTable('registration')
		.addColumn('id', 'integer', c => c.primaryKey())
		.addColumn('signup', 'text', c => c.notNull().defaultTo('open'))
		.addColumn('updated', 'text')
		.addColumn('updater', 'integer', c => c.references('users.id').onDelete('set null'))
		.addCheckConstraint('registration_singleton', sql`id = 1`)
		.addCheckConstraint('registration_signup', sql`signup in ('open', 'invite')`)
		.execute()

	await db.insertInto('registration').values({ id: 1, signup: 'open' }).execute()
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('registration').execute()
	await db.schema.dropTable('messages').execute()
	await db.schema.dropTable('participants').execute()
	await db.schema.dropTable('chats').execute()
}
