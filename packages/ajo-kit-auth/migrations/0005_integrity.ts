import { sql, type Kysely } from 'ajo-kit/database'

export async function up(db: Kysely<any>): Promise<void> {
	await sql`
		DELETE FROM members
		WHERE rowid NOT IN (
			SELECT min(rowid) FROM members GROUP BY user, role
		)
	`.execute(db)

	await db.schema
		.createIndex('idx_members_user_role')
		.unique()
		.on('members')
		.columns(['user', 'role'])
		.execute()
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropIndex('idx_members_user_role').execute()
}
