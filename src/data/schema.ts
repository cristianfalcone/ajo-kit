import { sql } from 'kysely'
import { db } from './db'

export async function migrate(): Promise<void> {
	const k = db()

	// Users
	await k.schema
		.createTable('users')
		.ifNotExists()
		.addColumn('id', 'integer', c => c.primaryKey())
		.addColumn('username', 'text', c => c.notNull().unique())
		.addColumn('firstName', 'text', c => c.notNull())
		.addColumn('lastName', 'text', c => c.notNull())
		.addColumn('email', 'text', c => c.notNull())
		.execute()

	// Posts
	await k.schema
		.createTable('posts')
		.ifNotExists()
		.addColumn('id', 'integer', c => c.primaryKey())
		.addColumn('title', 'text', c => c.notNull())
		.addColumn('body', 'text', c => c.notNull())
		.addColumn('userId', 'integer', c => c.notNull().references('users.id'))
		.addColumn('createdAt', 'text', c => c.defaultTo(sql`CURRENT_TIMESTAMP`))
		.addColumn('updatedAt', 'text', c => c.defaultTo(sql`CURRENT_TIMESTAMP`))
		.execute()

	// Comments
	await k.schema
		.createTable('comments')
		.ifNotExists()
		.addColumn('id', 'integer', c => c.primaryKey())
		.addColumn('postId', 'integer', c => c.notNull().references('posts.id'))
		.addColumn('body', 'text', c => c.notNull())
		.addColumn('userId', 'integer', c => c.notNull().references('users.id'))
		.addColumn('createdAt', 'text', c => c.defaultTo(sql`CURRENT_TIMESTAMP`))
		.addColumn('updatedAt', 'text', c => c.defaultTo(sql`CURRENT_TIMESTAMP`))
		.execute()

	// Products
	await k.schema
		.createTable('products')
		.ifNotExists()
		.addColumn('id', 'integer', c => c.primaryKey())
		.addColumn('title', 'text', c => c.notNull())
		.addColumn('price', 'real', c => c.notNull())
		.addColumn('description', 'text', c => c.notNull())
		.addColumn('thumbnail', 'text', c => c.notNull())
		.addColumn('images', 'text', c => c.notNull()) // JSON array
		.addColumn('category', 'text', c => c.notNull())
		.addColumn('brand', 'text', c => c.notNull())
		.addColumn('rating', 'real', c => c.notNull())
		.addColumn('stock', 'integer', c => c.notNull())
		.execute()
}

export async function rollback(): Promise<void> {
	const k = db()
	await k.schema.dropTable('comments').ifExists().execute()
	await k.schema.dropTable('posts').ifExists().execute()
	await k.schema.dropTable('products').ifExists().execute()
	await k.schema.dropTable('users').ifExists().execute()
}
