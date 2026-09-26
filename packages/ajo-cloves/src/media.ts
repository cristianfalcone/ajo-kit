import type { Host } from 'ajo'
import { dom, shared } from './core'

/** Reactive inputs used to configure a shared media-query view. */
export type MediaOptions = {
	/** Current media-query string, read by `sync()`. */
	query: () => string
}

const lists = new Map<string, MediaQueryList>()

const start = (query: string) => (notify: () => void) => {
	const list = window.matchMedia(query)

	lists.set(query, list)
	list.addEventListener('change', notify)

	return () => {
		list.removeEventListener('change', notify)
		if (lists.get(query) === list) lists.delete(query)
	}
}

const read = (query: string | undefined) => query ? lists.get(query)?.matches ?? false : false

/**
 * Reactive media-query match, shared per query string; false on the server.
 *
 * @example
 * ```ts
 * const narrow = media(this, { query: () => '(max-width: 768px)' })
 * for (const args of this) {
 * 	narrow.sync()
 * 	yield <span>{narrow.matches ? 'narrow' : 'wide'}</span>
 * }
 * ```
 */
export const media = (host: Host, options: MediaOptions) => {
	const { query } = options
	let active: string | undefined
	let current = false
	let scope: AbortController | undefined

	const stop = () => {
		scope?.abort()
		scope = undefined
		active = undefined
	}

	const update = () => {
		const next = read(active)
		if (next === current) return

		host.next(() => {
			current = next
		})
	}

	if (!dom(host) || typeof window.matchMedia != 'function') {
		return {
			get matches() {
				return false
			},
			sync() {},
		}
	}

	host.signal.addEventListener('abort', stop, { once: true })

	return {
		get matches() {
			return read(active)
		},
		sync() {
			if (host.signal.aborted) return

			const next = query()
			if (next === active) {
				current = read(active)
				return
			}

			scope?.abort()
			scope = new AbortController()
			active = next
			shared(`media:${next}`, start(next), update, scope.signal)
			current = read(active)
		},
	}
}
