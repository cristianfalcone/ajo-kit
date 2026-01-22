import sade from 'sade'
import { sql } from 'kysely'
import { db, close } from './db'
import type { NewUser, NewPost, NewComment, NewProduct } from './types'

async function fetchJson<T>(url: string): Promise<T> {
	const res = await fetch(url)
	if (!res.ok) throw new Error(`Failed to fetch ${url}`)
	return res.json()
}

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
		.addColumn('email', 'text', c => c.notNull().unique())
		.addColumn('password', 'text')
		.addColumn('verified', 'integer', c => c.defaultTo(0))
		.addColumn('created', 'text', c => c.defaultTo(sql`CURRENT_TIMESTAMP`))
		.execute()

	// Sessions
	await k.schema
		.createTable('sessions')
		.ifNotExists()
		.addColumn('id', 'text', c => c.primaryKey())
		.addColumn('userId', 'integer', c => c.notNull().references('users.id').onDelete('cascade'))
		.addColumn('expiry', 'text', c => c.notNull())
		.addColumn('created', 'text', c => c.defaultTo(sql`CURRENT_TIMESTAMP`))
		.execute()

	// Roles
	await k.schema
		.createTable('roles')
		.ifNotExists()
		.addColumn('id', 'integer', c => c.primaryKey())
		.addColumn('name', 'text', c => c.notNull().unique())
		.execute()

	// Members (user-role junction)
	await k.schema
		.createTable('members')
		.ifNotExists()
		.addColumn('userId', 'integer', c => c.notNull().references('users.id').onDelete('cascade'))
		.addColumn('roleId', 'integer', c => c.notNull().references('roles.id').onDelete('cascade'))
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
	await k.schema.dropTable('members').ifExists().execute()
	await k.schema.dropTable('sessions').ifExists().execute()
	await k.schema.dropTable('roles').ifExists().execute()
	await k.schema.dropTable('users').ifExists().execute()
}

export async function seed(): Promise<void> {

	console.log('Seeding database...')

	// Fresh start
	await rollback()
	await migrate()

	const k = db()

	// Fetch from DummyJSON
	const [usersData, postsData, productsData] = await Promise.all([
		fetchJson<{ users: any[] }>('https://dummyjson.com/users?limit=20'),
		fetchJson<{ posts: any[] }>('https://dummyjson.com/posts?limit=30'),
		fetchJson<{ products: any[] }>('https://dummyjson.com/products?limit=20'),
	])

	// Insert users
	const users: NewUser[] = usersData.users.map(u => ({
		id: u.id,
		username: u.username,
		firstName: u.firstName,
		lastName: u.lastName,
		email: u.email,
	}))

	await k.insertInto('users').values(users).execute()

	console.log(`  ${users.length} users`)

	// Insert posts (clamp userId to available users)
	const maxUserId = users.length
	const posts: NewPost[] = postsData.posts.map(p => ({
		id: p.id,
		title: p.title,
		body: p.body,
		userId: ((p.userId - 1) % maxUserId) + 1, // Ensure valid userId
	}))

	await k.insertInto('posts').values(posts).execute()

	console.log(`  ${posts.length} posts`)

	// Fetch and insert comments for first 10 posts
	const commentPromises = posts.slice(0, 10).map(p =>
		fetchJson<{ comments: any[] }>(`https://dummyjson.com/posts/${p.id}/comments`)
	)

	const commentsData = await Promise.all(commentPromises)

	let commentId = 1

	const comments: NewComment[] = commentsData.flatMap((data, i) =>
		data.comments.map(c => ({
			id: commentId++,
			postId: posts[i].id,
			body: c.body,
			userId: ((c.user?.id ?? 1) - 1) % maxUserId + 1, // Ensure valid userId
		}))
	)

	if (comments.length) {
		await k.insertInto('comments').values(comments).execute()
	}

	console.log(`  ${comments.length} comments`)

	// Insert products
	const products: (Omit<NewProduct, 'images'> & { images: string })[] = productsData.products.map(p => ({
		id: p.id,
		title: p.title,
		price: p.price,
		description: p.description,
		thumbnail: p.thumbnail,
		images: JSON.stringify(p.images),
		category: p.category,
		brand: p.brand ?? '',
		rating: p.rating ?? 0,
		stock: p.stock ?? 0,
	}))

	await k.insertInto('products').values(products).execute()

	console.log(`  ${products.length} products`)

	// Insert default roles
	const roles = [
		{ id: 1, name: 'admin' },
		{ id: 2, name: 'user' },
		{ id: 3, name: 'moderator' },
	]

	await k.insertInto('roles').values(roles).execute()

	console.log(`  ${roles.length} roles`)
	console.log('Done!')
}

// CLI

const run = (fn: () => Promise<void>) => fn().then(close).catch(error => {
	console.error(error)
	process.exit(1)
})

sade('db')
	.command('seed')
	.describe('Seed database with sample data from DummyJSON')
	.action(() => run(seed))
	.command('migrate')
	.describe('Run database migrations')
	.action(() => run(async () => {
		await migrate()
		console.log('Migrations complete')
	}))
	.command('rollback')
	.describe('Drop all tables')
	.action(() => run(async () => {
		await rollback()
		console.log('Rollback complete')
	}))
	.parse(process.argv)
