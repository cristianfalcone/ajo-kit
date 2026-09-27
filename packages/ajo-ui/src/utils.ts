import type { Args as AjoArgs, Stateless } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'

/** Omits named arguments without collapsing Ajo's open Args index signature. */
export type OmitArg<T, Keys extends PropertyKey> = {
	[Key in keyof T as Key extends Keys ? never : Key]: T[Key]
}

/** Marks component arguments owned by an adapter as unavailable to callers. */
export type FixedArgs<Keys extends PropertyKey> = {
	[Key in Keys]?: never
}

type ClassValue = string | boolean | null | undefined

/**
 * Joins the non-empty string class names, or returns undefined when none remain.
 * A recipe whose first argument is its non-empty base gets a string back.
 */
export function clx(base: string, ...values: ClassValue[]): string
export function clx(...values: ClassValue[]): string | undefined
export function clx(...values: ClassValue[]) {
	return values.filter(value => typeof value === 'string' && value).join(' ') || undefined
}

/**
 * Builds a slot part from a tag or a component. `slot` is a default `data-slot`
 * the caller may override; `fixed` attributes win over the caller's, except
 * `class`, which joins the caller's classes. Calls are pure, so unused parts tree-shake.
 */
/* @__NO_SIDE_EFFECTS__ */
export const part = <Args extends AjoArgs>(
	type: string | Stateless<Args>,
	slot: string,
	fixed?: Record<string, unknown> & { class?: string },
): Stateless<Args> => ({ class: classes, ...attrs }: Args & { class?: string }) =>
	jsx(type, { 'data-slot': slot, ...attrs, ...fixed, class: clx(fixed?.class, classes) })

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
