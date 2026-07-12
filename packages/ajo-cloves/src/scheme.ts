import type { Host } from './core'
import { media } from './media'

const dark = '(prefers-color-scheme: dark)'

/**
 * Reactive OS color-scheme preference.
 *
 * @example
 * ```ts
 * const color = scheme(this)
 * yield <span>{color.dark ? 'dark' : 'light'}</span>
 * ```
 */
export const scheme = (host: Host) => {
	const query = media(host, () => dark)

	query.sync()

	return {
		get dark() {
			return query.matches
		},
	}
}
