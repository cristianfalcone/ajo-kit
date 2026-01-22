import {
	safeParse,
	flatten,
	type GenericSchema,
	type InferOutput,
} from 'valibot'
import { InvalidError, type ValidationFields } from '../constants'

// Types
export type {
	User,
	Post,
	Comment,
	Product,
	PostWithUser,
	PostWithDetails,
	CommentWithUser,
	Session,
	Role,
} from './types'

// Database
export { db, close } from './db'

// Repositories
export { posts, comments } from './blog'
export { products } from './shop'
export { users, sessions, roles } from './auth'

// Validation fields
export * from './fields'

// Parse with validation
export function parse<T extends GenericSchema>(schema: T, data: unknown): InferOutput<T> {

	const result = safeParse(schema, data)

	if (result.success) return result.output

	const flat = flatten<T>(result.issues)
	const fields: ValidationFields = { ...flat.nested }

	if (flat.root?.length) fields._form = flat.root

	const nested = flat.nested as Record<string, string[]> | undefined
	const message = flat.root?.[0] ?? Object.values(nested ?? {})[0]?.[0] ?? 'Validation failed'

	throw new InvalidError(fields, message)
}
