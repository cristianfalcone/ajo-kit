import type { Host } from 'ajo'
import { dom } from './core'

type StorageOptions = {
	/** localStorage key. */
	key: string
	/** Value returned when storage is unavailable, throws, or the key is missing. */
	fallback: string
}

const read = (key: string, fallback: string) => {
	try {
		return window.localStorage.getItem(key) ?? fallback
	} catch {
		return fallback
	}
}

/**
 * Reactive localStorage string with cross-tab sync; the fallback on the server.
 * The value is whatever another tab or script stored: compare it with known
 * literals and never interpolate it unchecked.
 *
 * @example
 * ```ts
 * const theme = storage(this, { key: 'theme', fallback: 'light' })
 * yield <button set:onclick={() => theme.set('dark')}>{theme.value}</button>
 * ```
 */
export const storage = (host: Host, { key, fallback }: StorageOptions) => {
	if (!dom(host)) {
		return {
			get value() {
				return fallback
			},
			set(_next: string) {},
		}
	}

	let current = read(key, fallback)

	const update = (next: string) => {
		host.next(() => {
			current = next
		})
	}

	window.addEventListener('storage', () => {
		const next = read(key, fallback)
		if (next !== current) update(next)
	}, { signal: host.signal })

	return {
		get value() {
			return current
		},
		set(next: string) {
			if (host.signal.aborted) return

			try {
				window.localStorage.setItem(key, next)
			} catch { }

			update(next)
		},
	}
}
