import type { Host } from './core'
import { controlled } from './controlled'

/** Single/multi selection semantics over a controlled list of values. */
export const selection = (host: Host, opts: {
	/** Multi-select mode. */
	multiple?: () => boolean
	/** Forbid deselecting the last selected value. */
	required?: () => boolean
	/** Initial uncontrolled values. */
	fallback?: string[]
	/** Called whenever values change. */
	onChange?: (values: string[], event?: Event) => void
}) => {
	const state = controlled(host, {
		fallback: [...(opts.fallback ?? [])],
		onChange: opts.onChange,
	})

	return {
		get values() {
			return state.value
		},
		has(value: string) {
			return state.value.includes(value)
		},
		toggle(value: string, event?: Event) {
			const base = state.value
			const exists = base.includes(value)
			let next: string[]

			if (opts.multiple?.() ?? false) {
				if (exists) {
					if ((opts.required?.() ?? false) && base.length <= 1) return
					next = base.filter(item => item !== value)
				} else {
					next = Array.from(new Set([...base, value]))
				}
			} else if (exists) {
				if (opts.required?.() ?? false) return
				next = []
			} else {
				next = [value]
			}

			state.set(next, event)
		},
		set(values: string[], event?: Event) {
			state.set([...values], event)
		},
		sync(values: string[] | null | undefined) {
			return state.sync(values == null ? undefined : [...values])
		},
	}
}
