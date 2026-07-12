import type { Host } from './core'
import { dom, shared } from './core'

type Area = 'local' | 'session'

type StorageOptions = {
	/** Live storage key. */
	key: () => string
	/** Value returned when storage is unavailable or the key is missing. */
	fallback: string
	/** Storage area. Default: 'local'. */
	area?: Area
}

let last: StorageEvent | undefined

const source = (notify: () => void) => {
	const handler = (event: StorageEvent) => {
		last = event
		notify()
	}

	window.addEventListener('storage', handler)
	return () => {
		window.removeEventListener('storage', handler)
		last = undefined
	}
}

const area = (name: Area) => {
	try {
		return name === 'local' ? window.localStorage : window.sessionStorage
	} catch {
		return undefined
	}
}

const get = (name: Area, key: string, fallback: string) => {
	const store = area(name)
	if (!store) return fallback

	try {
		return store.getItem(key) ?? fallback
	} catch {
		return fallback
	}
}

const put = (name: Area, key: string, value: string) => {
	const store = area(name)
	if (!store) return

	try {
		store.setItem(key, value)
	} catch { }
}

const drop = (name: Area, key: string) => {
	const store = area(name)
	if (!store) return

	try {
		store.removeItem(key)
	} catch { }
}

/**
 * Reactive localStorage or sessionStorage string value with cross-tab sync.
 *
 * @example
 * ```ts
 * const theme = storage(this, { key: () => 'theme', fallback: 'light' })
 * yield <button set:onclick={() => theme.set('dark')}>{theme.value}</button>
 * ```
 */
export const storage = (host: Host, opts: StorageOptions) => {
	const name = opts.area ?? 'local'

	if (!dom(host)) {
		return {
			get value() {
				return opts.fallback
			},
			set(_next: string) {},
			remove() {},
		}
	}

	let key = opts.key()
	let current = get(name, key, opts.fallback)

	const sync = () => {
		if (host.signal.aborted) return
		const next = opts.key()
		if (next === key) return

		host.next(() => {
			key = next
			current = get(name, key, opts.fallback)
		})
	}

	const set = (next: string) => {
		host.next(() => {
			current = next
		})
	}

	shared('storage', source, () => {
		sync()

		const event = last
		const store = area(name)

		if (event?.storageArea && store && event.storageArea !== store) return
		if (event?.key != null && event.key !== key) return

		const next = event?.key == null ? opts.fallback
			: event.key === key ? event.newValue ?? opts.fallback
				: get(name, key, opts.fallback)

		if (next === current) return
		host.next(() => {
			current = next
		})
	}, host.signal)

	return {
		get value() {
			sync()
			return current
		},
		set(next: string) {
			if (host.signal.aborted) return
			sync()
			put(name, key, next)
			set(next)
		},
		remove() {
			if (host.signal.aborted) return
			sync()
			drop(name, key)
			set(opts.fallback)
		},
	}
}
