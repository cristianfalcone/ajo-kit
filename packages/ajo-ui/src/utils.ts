/** Omits named arguments without collapsing Ajo's open Args index signature. */
export type OmitArg<T, Keys extends PropertyKey> = {
	[Key in keyof T as Key extends Keys ? never : Key]: T[Key]
}

/** Marks component arguments owned by an adapter as unavailable to callers. */
export type FixedArgs<Keys extends PropertyKey> = {
	[Key in Keys]?: never
}

/** Marks a boolean state attr: 'true' when set, absent otherwise. */
export const flag = (value: unknown) => value ? 'true' : undefined

/** Parses boolean-ish attr input (true, '', 'true'). */
export const bool = (value: unknown) =>
	value === true || value === '' || value === 'true'

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
export type StyleValue = string | number | false | null | undefined
export type StyleObject = {
	[Key in StyleProperty]?: StyleValue
} & {
	[Key in `--${string}`]?: StyleValue
}

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

export type PopoverElement = HTMLElement & {
	hidePopover?: () => void
	showPopover?: (options?: { source?: HTMLElement }) => void
}

/** Checks native Popover API open state without throwing in fallback browsers. */
const popoverOpen = (element: HTMLElement) =>
	typeof element.matches === 'function' && element.matches(':popover-open')

/** Opens a native popover, falling back to `hidden = false` when unsupported. */
export const openPopover = (element: PopoverElement, source?: HTMLElement | null) => {
	if (popoverOpen(element)) return
	if (typeof element.showPopover === 'function') {
		try {
			if (source) element.showPopover({ source })
			else element.showPopover()
		} catch { }
	} else {
		element.hidden = false
	}
}

/** Closes a native popover, falling back to `hidden = true` when unsupported. */
export const closePopover = (element: PopoverElement) => {
	if (typeof element.hidePopover === 'function') {
		try {
			if (popoverOpen(element)) element.hidePopover()
		} catch { }
	} else {
		element.hidden = true
	}
}
