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

	await db.schema.createIndex('messages_chat_idx').on('messages').column('chat').execute()
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('messages').execute()
	await db.schema.dropTable('participants').execute()
	await db.schema.dropTable('chats').execute()
}
