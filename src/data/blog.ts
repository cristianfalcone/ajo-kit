import { db } from './db'
import type { User, PostWithUser, PostWithDetails, CommentWithUser } from './types'

const postImage = (id: number, size = '600/400') =>
	`https://picsum.photos/seed/ajo-post-${id}/${size}`

// Users

export const users = {
	all: () =>
		db().selectFrom('users').selectAll().execute(),

	find: (id: number) =>
		db().selectFrom('users').selectAll().where('id', '=', id).executeTakeFirst(),

	byIds: async (ids: number[]): Promise<Map<number, User>> => {
		if (!ids.length) return new Map()
		const rows = await db().selectFrom('users').selectAll().where('id', 'in', ids).execute()
		return new Map(rows.map(u => [u.id, u]))
	},
}

// Posts

export const posts = {
	all: async (limit = 18): Promise<PostWithUser[]> => {
		const rows = await db()
			.selectFrom('posts')
			.selectAll()
			.orderBy('id', 'desc')
			.limit(limit)
			.execute()

		const userMap = await users.byIds([...new Set(rows.map(p => p.userId))])

		return rows.map(p => ({
			...p,
			user: userMap.get(p.userId),
			imageUrl: postImage(p.id),
		}))
	},

	find: async (id: number): Promise<PostWithDetails | undefined> => {
		const post = await db()
			.selectFrom('posts')
			.selectAll()
			.where('id', '=', id)
			.executeTakeFirst()

		if (!post) return undefined

		const [user, postComments] = await Promise.all([
			users.find(post.userId),
			comments.forPost(id),
		])

		return {
			...post,
			user,
			imageUrl: postImage(id, '1200/700'),
			comments: postComments,
		}
	},
}

// Comments

export const comments = {
	forPost: async (postId: number): Promise<CommentWithUser[]> => {
		const rows = await db()
			.selectFrom('comments')
			.selectAll()
			.where('postId', '=', postId)
			.orderBy('id', 'asc')
			.execute()

		const userMap = await users.byIds([...new Set(rows.map(c => c.userId))])

		return rows.map(c => ({
			...c,
			user: userMap.get(c.userId),
		}))
	},
}
