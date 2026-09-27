import { callHandler } from 'ajo-cloves'

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

const hostArg = (key: string) =>
	key === 'children' || key === 'key' || key === 'memo' || key === 'ref' || key === 'skip' || key.startsWith('set:')

type Keys<A> = A extends unknown ? keyof A : never

/**
 * Forwards wrapper args to an Ajo Stateful root: `own` keys, children and host
 * keys stay args, and every other key becomes an `attr:` host attribute.
 */
export const rootAttrs = <A extends object, const K extends Keys<A> = never>(args: A, own: readonly K[] = []) => {
	const result: Record<string, unknown> = {}
	for (const [key, value] of Object.entries(args)) {
		result[hostArg(key) || (own as readonly string[]).includes(key) ? key : `attr:${key}`] = value
	}
	return result as (A extends unknown ? Pick<A, (K | 'children') & keyof A> : never) & { [key: `attr:${string}`]: unknown }
}

/** Item activation guard: skips when disabled, runs the caller's handler, then the action unless prevented. */
export const activate = (
	disabled: boolean,
	handler: unknown,
	action: (event: Event) => void,
) => (event: Event) => {
	if (disabled) return
	callHandler(handler, event)
	if (event.defaultPrevented) return
	action(event)
}
