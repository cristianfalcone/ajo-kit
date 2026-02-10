import {
	safeParse,
	flatten,
	type GenericSchema,
	type InferOutput,
} from 'valibot'
import { InvalidError, type ValidationFields } from './constants'

export {
	object, string, number, boolean, array, optional, literal,
	pipe, trim, toLowerCase, transform, forward, partialCheck,
	email, minLength, maxLength, unknown,
	type GenericSchema, type InferOutput,
} from 'valibot'

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
