import type { Stateless } from 'ajo'
import { callRef } from 'ajo-cloves'
import { jsx } from 'ajo/jsx-runtime'

type SlotArgs = Record<string, unknown> & { 'data-slot'?: string }

/** Logical placement shared by Ajo popup roots. */
export type PopupPlacement =
	| 'top' | 'top-start' | 'top-end'
	| 'right' | 'right-start' | 'right-end'
	| 'bottom' | 'bottom-start' | 'bottom-end'
	| 'left' | 'left-start' | 'left-end'
	| 'auto'

/** Small semantic positioning contract shared by Ajo popup roots. */
export type PopupPosition = {
	/** Preferred logical placement; auto chooses the most available space. */
	placement?: PopupPlacement
	/** Distance between the reference and floating box, in CSS pixels. */
	gap?: number
}

type TriggerAttrsOptions<Element extends HTMLElement> = {
	controls?: string
	describedby?: string
	expanded?: boolean
	haspopup?: 'dialog' | 'listbox' | 'menu'
	id?: unknown
	open: boolean
	ref?: unknown
	setTrigger?: (element: Element | null) => void
	triggerId?: string
}

/** Builds state, popup relations, ids and a composed trigger ref. */
export const triggerAttrs = <Element extends HTMLElement>(options: TriggerAttrsOptions<Element>): Record<string, unknown> => {
	const { controls, describedby, expanded, haspopup, id, open, ref, setTrigger, triggerId } = options
	const attrs: Record<string, unknown> = { 'data-state': open ? 'open' : 'closed' }
	if ('controls' in options) attrs['aria-controls'] = controls
	if ('describedby' in options) attrs['aria-describedby'] = describedby
	if ('expanded' in options) attrs['aria-expanded'] = expanded ? 'true' : 'false'
	if ('haspopup' in options) attrs['aria-haspopup'] = haspopup
	if ('id' in options || 'triggerId' in options) attrs.id = id ?? triggerId
	if ('ref' in options || 'setTrigger' in options) {
		attrs.ref = (element: Element | null) => {
			setTrigger?.(element)
			callRef(ref, element)
		}
	}
	return attrs
}

/** Inline reset for a native popover plus caller-owned declarations. */
export const popupStyle = (...parts: unknown[]) =>
	['inset:auto', 'margin:0', ...parts.filter((part): part is string => typeof part === 'string' && part.length > 0)].join(';')

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

/** Marks a boolean state attr: 'true' when set, absent otherwise. */
export const flag = (value: unknown) => value ? 'true' : undefined

/** Parses boolean-ish attr input (true, '', 'true'). */
export const bool = (value: unknown) =>
	value === true || value === '' || value === 'true'

/** Normalized state shared by native and visual checked controls. */
export type CheckedState = 'checked' | 'indeterminate' | 'unchecked'

/** Maps a checked-state token to the native aria-checked vocabulary. */
export const ariaChecked = (state: CheckedState) =>
	state === 'indeterminate' ? 'mixed' : state === 'checked' ? 'true' : 'false'

/** Mirrors a native input's live checked state onto it and one visual companion. */
export const syncCheckedState = (input: HTMLInputElement, companion?: HTMLElement | null): CheckedState => {
	const state = input.type === 'checkbox' && input.indeterminate
		? 'indeterminate'
		: input.checked ? 'checked' : 'unchecked'
	input.dataset.state = state
	input.setAttribute('aria-checked', ariaChecked(state))
	if (companion) companion.dataset.state = state
	return state
}

/** Flattens JSX children into their concatenated plain-text content. */
export const text = (value: unknown): string => {
	if (value == null || value === false) return ''
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') return String(value)
	if (Array.isArray(value)) return value.map(text).join('')
	return ''
}

/** Copies a multi-value array while coercing each present value to a string. */
export const strings = (value: unknown): string[] =>
	Array.isArray(value) ? value.map(String) : []

/** Token match: every whitespace-separated search token appears in the haystack, case-insensitive; an empty search matches. */
export const matchesTokens = (search: string, haystack: string) => {
	const query = search.trim().toLowerCase()
	if (!query) return true
	const target = haystack.trim().toLowerCase()
	return query.split(/\s+/).every(part => target.includes(part))
}

/** Formats the default English result count for filterable collections. */
export const defaultResultsLabel = (count: number) =>
	`${count} result${count === 1 ? '' : 's'}`

const passAll = () => true

/** Resolves undefined to the built-in filter, null to unfiltered, and preserves a custom filter. */
export const resolveFilter = <Args extends unknown[]>(
	filter: ((...args: Args) => boolean) | null | undefined,
	fallback: (...args: Args) => boolean,
): ((...args: Args) => boolean) =>
	filter === undefined ? fallback : filter ?? passAll

/** Joins conditional class names, returning undefined when empty. */
export const clx = (...values: Array<string | false | null | undefined>) =>
	values.filter(Boolean).join(' ') || undefined

/** Coerces to a finite number, falling back otherwise. */
export const toNumber = (value: unknown, fallback: number) => {
	const next = Number(value)
	return Number.isFinite(next) ? next : fallback
}

/** Returns true when JSX children carry no visible content. */
export const emptyChildren = (children: unknown) =>
	children == null ||
	children === false ||
	(Array.isArray(children) && children.every(child => child == null || child === false))

type DomStyleProperty = Exclude<{
	[Key in keyof CSSStyleDeclaration]-?: Key extends string
		? CSSStyleDeclaration[Key] extends string ? Key : never
		: never
}[keyof CSSStyleDeclaration], 'cssText'>

type KebabCase<Value extends string> = Value extends `${infer Head}${infer Tail}`
	? Head extends Lowercase<Head>
		? `${Head}${KebabCase<Tail>}`
		: `-${Lowercase<Head>}${KebabCase<Tail>}`
	: Value

type StyleProperty = DomStyleProperty | KebabCase<DomStyleProperty>

/** Primitive value accepted by one inline style property. */
export type StyleValue = string | number | false | null | undefined

/** Typed inline style properties, including custom CSS variables. */
export type StyleObject = {
	[Key in StyleProperty]?: StyleValue
} & {
	[Key in `--${string}`]?: StyleValue
}

/** Recursive input accepted by the inline style serializer. */
export type StyleInput = StyleValue | true | StyleObject | readonly StyleInput[]

const property = (key: string) => {
	if (key === 'cssFloat') return 'float'
	if (key.startsWith('--')) return key
	const css = key.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)
	return css.startsWith('ms-') ? `-${css}` : css
}

const collectStyles = (input: StyleInput, result: string[]) => {
	if (!input || input === true || typeof input === 'number') return
	if (typeof input === 'string') {
		const value = input.trim().replace(/;+$/, '')
		if (value) result.push(value)
		return
	}
	if (Array.isArray(input)) {
		for (const item of input) collectStyles(item, result)
		return
	}
	for (const [key, value] of Object.entries(input)) {
		if (value == null || value === false) continue
		result.push(`${property(key)}:${value}`)
	}
}

/** Build an inline style string from strings, objects, arrays, and falsey entries. */
export const stlx = (...input: StyleInput[]) => {
	const result: string[] = []
	for (const item of input) collectStyles(item, result)
	return result.join(';')
}
