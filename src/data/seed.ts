import sade from 'sade'
import { db, close } from './db'
import { migrate, rollback } from './schema'
import type { NewUser, NewPost, NewComment, NewProduct } from './types'

async function fetchJson<T>(url: string): Promise<T> {
	const res = await fetch(url)
	if (!res.ok) throw new Error(`Failed to fetch ${url}`)
	return res.json()
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
	console.log('Done!')
}

// CLI

const run = (fn: () => Promise<void>) =>
	fn().then(close).catch(e => { console.error(e); process.exit(1) })

sade('db')
	.command('seed')
	.describe('Seed database with sample data from DummyJSON')
	.action(() => run(seed))
	.command('migrate')
	.describe('Run database migrations')
	.action(() => run(async () => { await migrate(); console.log('Migrations complete') }))
	.command('rollback')
	.describe('Drop all tables')
	.action(() => run(async () => { await rollback(); console.log('Rollback complete') }))
	.parse(process.argv)
