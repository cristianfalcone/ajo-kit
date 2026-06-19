import type { Kysely } from 'ajo-kit/database'

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema.createIndex('idx_sessions_user_created').on('sessions').columns(['user', 'created']).execute()
	await db.schema.createIndex('idx_sessions_created').on('sessions').column('created').execute()
	await db.schema.createIndex('idx_sessions_user_last').on('sessions').columns(['user', 'last']).execute()
	await db.schema.createIndex('idx_members_user').on('members').column('user').execute()
	await db.schema.createIndex('idx_members_role').on('members').column('role').execute()
	await db.schema.createIndex('idx_participants_user_chat').on('participants').columns(['user', 'chat']).execute()
	await db.schema.createIndex('idx_messages_chat_id').on('messages').columns(['chat', 'id']).execute()
	await db.schema.createIndex('idx_messages_chat_created').on('messages').columns(['chat', 'created']).execute()
	await db.schema.createIndex('idx_users_created').on('users').column('created').execute()
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropIndex('idx_users_created').execute()
	await db.schema.dropIndex('idx_messages_chat_created').execute()
	await db.schema.dropIndex('idx_messages_chat_id').execute()
	await db.schema.dropIndex('idx_participants_user_chat').execute()
	await db.schema.dropIndex('idx_members_role').execute()
	await db.schema.dropIndex('idx_members_user').execute()
	await db.schema.dropIndex('idx_sessions_user_last').execute()
	await db.schema.dropIndex('idx_sessions_created').execute()
	await db.schema.dropIndex('idx_sessions_user_created').execute()
}
