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
