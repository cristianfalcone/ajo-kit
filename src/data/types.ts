import type { Generated, Selectable, Insertable } from 'kysely'

// Table Schemas

export interface UsersTable {
	id: number
	username: string
	firstName: string
	lastName: string
	email: string
}

export interface PostsTable {
	id: number
	title: string
	body: string
	userId: number
	createdAt: Generated<string>
	updatedAt: Generated<string>
}

export interface CommentsTable {
	id: number
	postId: number
	body: string
	userId: number
	createdAt: Generated<string>
	updatedAt: Generated<string>
}

export interface ProductsTable {
	id: number
	title: string
	price: number
	description: string
	thumbnail: string
	images: string // JSON array in DB
	category: string
	brand: string
	rating: number
	stock: number
}

export interface DB {
	users: UsersTable
	posts: PostsTable
	comments: CommentsTable
	products: ProductsTable
}

// Derived Types (Selectable = query results)

export type User = Selectable<UsersTable>
export type Post = Selectable<PostsTable>
export type Comment = Selectable<CommentsTable>
export type Product = Omit<Selectable<ProductsTable>, 'images'> & { images: string[] }

export type NewUser = Insertable<UsersTable>
export type NewPost = Insertable<PostsTable>
export type NewComment = Insertable<CommentsTable>
export type NewProduct = Insertable<ProductsTable>

// Enriched Types (for API responses)

export type PostWithUser = Post & { user?: User; imageUrl: string }
export type PostWithDetails = PostWithUser & { comments: CommentWithUser[] }
export type CommentWithUser = Comment & { user?: User }
