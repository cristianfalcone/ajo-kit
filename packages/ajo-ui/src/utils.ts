import type { Stateless } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'

type SlotArgs = Record<string, unknown> & { 'data-slot'?: string }

/** Omits named arguments without collapsing Ajo's open Args index signature. */
export type OmitArg<T, Keys extends PropertyKey> = {
	[Key in keyof T as Key extends Keys ? never : Key]: T[Key]
}

/** Marks component arguments owned by an adapter as unavailable to callers. */
export type FixedArgs<Keys extends PropertyKey> = {
	[Key in Keys]?: never
}

/** Wraps a re-exported family part with a fixed data-slot and optional defaults. */
export const withSlot = <Args extends SlotArgs>(
	Component: Stateless<Args>,
	slot: string,
	defaults?: Partial<Args>,
): Stateless<Args> => attrs => jsx(Component, { ...defaults, ...attrs, 'data-slot': slot })

/** Parses boolean-ish attr input (true, '', 'true'). */
export const bool = (value: unknown) =>
	value === true || value === '' || value === 'true'

type StyleInput = string | Record<string, string | number | false | null | undefined> | boolean | null | undefined

const property = (key: string) => {
	if (key === 'cssFloat') return 'float'
	if (key.startsWith('--')) return key
	const css = key.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)
	return css.startsWith('ms-') ? `-${css}` : css
}

/** Build an inline style string from declaration strings, property objects, and falsy entries. */
export const stlx = (...input: StyleInput[]) => {
	const result: string[] = []
	for (const item of input) {
		if (!item || item === true) continue
		if (typeof item === 'string') {
			const value = item.trim().replace(/;+$/, '')
			if (value) result.push(value)
			continue
		}
		for (const [key, value] of Object.entries(item)) {
			if (value == null || value === false) continue
			result.push(`${property(key)}:${value}`)
		}
	}
	return result.join(';')
}
