import { stringify, parse, uneval } from 'devalue'

type WithJSON = { toJSON: () => unknown }

const hasJSON = (value: unknown): value is WithJSON =>
	value !== null && typeof value === 'object' && 'toJSON' in value

// For uneval: replacer function that handles toJSON
const replacer = (value: unknown, uneval: (v: unknown) => string): string | void => {
	if (hasJSON(value)) return uneval(value.toJSON())
}

// For stringify: reducers object
const reducers = {
	json: (value: unknown) => hasJSON(value) ? value.toJSON() : undefined
}

export const embed = (value: unknown) => uneval(value, replacer)
export const pack = (value: unknown) => stringify(value, reducers)
export const unpack = (value: string) => parse(value)
