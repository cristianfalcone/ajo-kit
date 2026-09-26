import type { Host } from 'ajo'
import { dom } from './core'
import { timer } from './timer'

const label = (item: HTMLElement) => item.dataset.label ?? item.textContent?.trim() ?? ''

const printable = (event: KeyboardEvent) =>
	event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey

/** Typeahead: buffers printable keys and matches by label prefix without preventing default. */
export const typeahead = (host: Host, opts: {
	/** Live list of searchable elements, matched by `data-label` or text content. */
	items: () => HTMLElement[]
	/** Applies a matching item. */
	onMatch: (item: HTMLElement, event: KeyboardEvent) => void
}) => {
	if (!dom(host)) return { handle: (_event: KeyboardEvent) => false }

	const reset = timer(host)
	let query = ''

	return {
		handle(event: KeyboardEvent) {
			if (!printable(event)) return false

			query = `${query}${event.key}`.toLowerCase()
			reset.start(600, () => query = '')

			const match = opts.items().find(item => label(item).toLowerCase().startsWith(query))
			if (match) opts.onMatch(match, event)
			return true
		},
	}
}
