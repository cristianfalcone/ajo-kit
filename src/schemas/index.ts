import * as v from 'valibot'
import { RouteError } from '../constants'

export * from './fields'
export * from './params'
export { v }

export type Fields = Record<string, string[] | undefined>

export class Invalid extends RouteError {

	constructor(public fields: Fields, message = 'Validation failed') {
		super(400, message)
	}

	toJSON() {
		return { error: this.message, fields: this.fields }
	}
}

export function parse<T extends v.GenericSchema>(schema: T, data: unknown): v.InferOutput<T> {

	const result = v.safeParse(schema, data)

	if (result.success) return result.output

	const flat = v.flatten<T>(result.issues)
	const fields: Fields = { ...flat.nested }

	if (flat.root?.length) fields._form = flat.root

	const nested = flat.nested as Record<string, string[]> | undefined
	const message = flat.root?.[0] ?? Object.values(nested ?? {})[0]?.[0] ?? 'Validation failed'

	throw new Invalid(fields, message)
}
