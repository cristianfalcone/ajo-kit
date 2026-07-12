import type { Host } from './core'
import { dom, shared } from './core'

const start = (notify: () => void) => {
	document.addEventListener('visibilitychange', notify)
	return () => document.removeEventListener('visibilitychange', notify)
}

const read = () => document.visibilityState !== 'hidden'

/**
 * Reactive document visibility.
 *
 * @example
 * ```ts
 * const page = visibility(this)
 * yield <span>{page.visible ? 'visible' : 'hidden'}</span>
 * ```
 */
export const visibility = (host: Host) => {
	if (!dom(host)) {
		return {
			get visible() {
				return true
			},
		}
	}

	let current = read()

	shared('visibility', start, () => {
		const next = read()
		if (next === current) return

		host.next(() => {
			current = next
		})
	}, host.signal)

	return {
		get visible() {
			return current
		},
	}
}
