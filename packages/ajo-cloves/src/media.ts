import type { Host } from 'ajo'
import { dom } from './core'

/** Reactive inputs used to configure a media-query view. */
export type MediaOptions = {
	/** Current media-query string, read at setup and by `sync()`. */
	query: () => string
}

/**
 * Reactive media-query match; false on the server. The view subscribes at
 * setup; call `sync()` only when the query string can change.
 *
 * @example
 * ```ts
 * const dark = media(this, { query: () => '(prefers-color-scheme: dark)' })
 * while (true) yield <span>{dark.matches ? 'dark' : 'light'}</span>
 * ```
 */
export const media = (host: Host, options: MediaOptions) => {
	if (!dom(host) || typeof window.matchMedia != 'function') {
		return {
			get matches() {
				return false
			},
			sync() {},
		}
	}

	let query: string | undefined
	let list: MediaQueryList | undefined
	let scope: AbortController | undefined

	const sync = () => {
		const next = options.query()
		if (next === query) return

		scope?.abort()
		scope = new AbortController()
		query = next
		list = window.matchMedia(next)
		list.addEventListener('change', () => host.next(), { signal: AbortSignal.any([scope.signal, host.signal]) })
	}

	sync()

	return {
		get matches() {
			return list?.matches ?? false
		},
		sync() {
			if (!host.signal.aborted) sync()
		},
	}
}
