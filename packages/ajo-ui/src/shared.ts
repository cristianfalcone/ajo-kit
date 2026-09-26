/** Marks a boolean state attr: 'true' when set, absent otherwise. */
export const flag = (value: unknown) => value ? 'true' : undefined

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
