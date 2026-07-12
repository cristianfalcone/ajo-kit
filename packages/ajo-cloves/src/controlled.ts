import type { Host } from './core'

/** Controlled/uncontrolled value unification for open/value-style component args. */
export const controlled = <T>(host: Host, opts: {
	/** Initial uncontrolled value. */
	fallback: T
	/** Called whenever set() or accept() changes the value. */
	onChange?: (value: T, event?: Event) => void
}) => {
	let local = opts.fallback
	let value = local
	let bound = false

	return {
		get value() {
			return value
		},
		get controlled() {
			return bound
		},
		/** undefined = uncontrolled; any other value (null included) binds. */
		sync(arg: T | null | undefined) {
			bound = arg !== undefined
			value = bound ? arg as T : local
			return value
		},
		set(next: T, event?: Event) {
			opts.onChange?.(next, event)
			if (!bound) local = next
			host.next(() => value = next)
		},
		accept(next: T, event?: Event) {
			if (!bound) local = next
			host.next(() => value = next)
			opts.onChange?.(next, event)
		},
		/** Seeds the uncontrolled value without notifying onChange (lazy defaults). */
		init(next: T) {
			if (bound) return
			local = next
			host.next(() => value = next)
		},
	}
}
