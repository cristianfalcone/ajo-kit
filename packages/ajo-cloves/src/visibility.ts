import type { Host } from 'ajo'
import { dom } from './core'

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

	document.addEventListener('visibilitychange', () => host.next(), { signal: host.signal })

	return {
		get visible() {
			return document.visibilityState !== 'hidden'
		},
	}
}
