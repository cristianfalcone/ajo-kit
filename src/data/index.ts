import {
	safeParse,
	flatten,
	type GenericSchema,
	type InferOutput,
} from 'valibot'
import { InvalidError, type ValidationFields } from '/src/constants'

export type {
	User,
	Session,
	Role,
} from './types'

export { db, close, version, bump, snapshot, tap } from './db'
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
