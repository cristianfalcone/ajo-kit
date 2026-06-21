import type { Kysely } from 'ajo-kit/database'

const user = [
	'profile:read',
	'profile:update',
	'profile:delete',
	'sessions:read',
	'sessions:delete',
	'tokens:read',
	'tokens:create',
	'tokens:delete',
	'chats:read',
	'chats:create',
	'chats:send',
]

export async function up(db: Kysely<any>): Promise<void> {

	await db.schema
		.alterTable('roles')
		.addColumn('abilities', 'text', c => c.notNull().defaultTo('[]'))
		.execute()

	await db.updateTable('roles')
		.set({ abilities: JSON.stringify(['*']) })
		.where('name', '=', 'admin')
		.execute()

	await db.updateTable('roles')
		.set({ abilities: JSON.stringify(user) })
		.where('name', '=', 'user')
		.execute()
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema
		.alterTable('roles')
		.dropColumn('abilities')
		.execute()
}
