import {
	safeParse as safe,
	flatten,
	type GenericSchema as Schema,
	type InferOutput as Output,
} from 'valibot'
import { Invalid, type Fields } from './constants'

export {
	object, string, number, boolean, array, optional, literal,
	pipe, trim, toLowerCase, transform, forward, partialCheck,
	email, minLength, maxLength, unknown,
	type GenericSchema as Schema, type InferOutput as Output,
} from 'valibot'

export function parse<T extends Schema>(schema: T, data: unknown): Output<T> {

	const result = safe(schema, data)

	if (result.success) return result.output

	const flat = flatten<T>(result.issues)
	const fields: Fields = { ...flat.nested }

	if (flat.root?.length) fields._form = flat.root

	const nested = flat.nested as Record<string, string[]> | undefined
	const message = flat.root?.[0] ?? Object.values(nested ?? {})[0]?.[0] ?? 'Validation failed'

	throw new Invalid(fields, message)
}
