import type { Host } from './core'
import { dom, shared } from './core'

type MediaOptions = {
	/** Server and unsupported-browser match value. Default: false. */
	fallback?: () => boolean
}

const lists = new Map<string, MediaQueryList>()

const fallback = (opts: MediaOptions) => opts.fallback?.() ?? false

const start = (query: string) => (notify: () => void) => {
	const list = window.matchMedia(query)

	lists.set(query, list)
	list.addEventListener('change', notify)

	return () => {
		list.removeEventListener('change', notify)
		if (lists.get(query) === list) lists.delete(query)
	}
}

const read = (query: string | undefined, opts: MediaOptions) =>
	query ? lists.get(query)?.matches ?? fallback(opts) : fallback(opts)

/**
 * Reactive media-query match, shared per query string.
 *
 * @example
 * ```ts
 * const narrow = media(this, () => '(max-width: 768px)')
 * for (const args of this) {
 * 	narrow.sync()
 * 	yield <span>{narrow.matches ? 'narrow' : 'wide'}</span>
 * }
 * ```
 */
export const media = (host: Host, query: () => string, opts: MediaOptions = {}) => {
	let active: string | undefined
	let current = fallback(opts)
	let scope: AbortController | undefined

	const stop = () => {
		scope?.abort()
		scope = undefined
		active = undefined
	}

	const update = () => {
		const next = read(active, opts)
		if (next === current) return

		host.next(() => {
			current = next
		})
	}

	if (!dom(host) || typeof window.matchMedia != 'function') {
		return {
			get matches() {
				return fallback(opts)
			},
			sync() {},
		}
	}

	host.signal.addEventListener('abort', stop, { once: true })

	return {
		get matches() {
			return read(active, opts)
		},
		sync() {
			if (host.signal.aborted) return

			const next = query()
			if (next === active) {
				current = read(active, opts)
				return
			}

			scope?.abort()
			scope = new AbortController()
			active = next
			shared(`media:${next}`, start(next), update, scope.signal)
			current = read(active, opts)
		},
	}
}
