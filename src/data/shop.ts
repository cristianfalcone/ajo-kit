import { db } from './db'
import type { Product } from './types'

// Parse images JSON string to array
const enrich = (row: { images: string } & Omit<Product, 'images'>): Product => ({
	...row,
	images: JSON.parse(row.images),
})

export const products = {

	all: async (limit = 18): Promise<Product[]> => {
		const rows = await db()
			.selectFrom('products')
			.selectAll()
			.orderBy('id', 'asc')
			.limit(limit)
			.execute()
		return rows.map(enrich)
	},

	find: async (id: number): Promise<Product | undefined> => {
		const row = await db()
			.selectFrom('products')
			.selectAll()
			.where('id', '=', id)
			.executeTakeFirst()
		return row ? enrich(row) : undefined
	},

	byCategory: async (category: string): Promise<Product[]> => {
		const rows = await db()
			.selectFrom('products')
			.selectAll()
			.where('category', '=', category)
			.orderBy('id', 'asc')
			.execute()
		return rows.map(enrich)
	},

	search: async (query: string): Promise<Product[]> => {
		const rows = await db()
			.selectFrom('products')
			.selectAll()
			.where(eb =>
				eb.or([
					eb('title', 'like', `%${query}%`),
					eb('description', 'like', `%${query}%`),
				])
			)
			.orderBy('id', 'asc')
			.execute()
		return rows.map(enrich)
	},

	categories: async (): Promise<string[]> => {
		const rows = await db()
			.selectFrom('products')
			.select('category')
			.distinct()
			.execute()
		return rows.map(r => r.category)
	},
}
