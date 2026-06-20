import {
	safeParse,
	flatten,
	type GenericSchema,
	type InferOutput,
} from 'valibot'
import { Invalid, type Fields } from './constants'

/** Valibot schema builders and type helpers re-exported for app validation. */
export {
	object, string, number, boolean, array, optional, literal,
	pipe, trim, toLowerCase, transform, forward, partialCheck,
	email, minLength, maxLength, unknown,
	type GenericSchema, type InferOutput,
} from 'valibot'

/** Parses data with Valibot and throws Invalid with field errors on failure. */
export function parse<T extends GenericSchema>(schema: T, data: unknown): InferOutput<T> {

	const result = safeParse(schema, data)

	if (result.success) return result.output

	const flat = flatten<T>(result.issues)
	const fields: Fields = { ...flat.nested }

	if (flat.root?.length) fields._form = flat.root

	const nested = flat.nested as Record<string, string[]> | undefined
	const message = flat.root?.[0] ?? Object.values(nested ?? {})[0]?.[0] ?? 'Validation failed'

	throw new Invalid(fields, message)
}
