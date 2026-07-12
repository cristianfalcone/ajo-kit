import type { Host } from './core'
import { dom } from './core'
import { timer } from './timer'

const label = (item: HTMLElement) => item.dataset.label ?? item.textContent?.trim() ?? ''

const printable = (event: KeyboardEvent) =>
	event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey

/** Typeahead: buffers printable keys and matches by label prefix without preventing default. */
export const typeahead = (host: Host, opts: {
	/** Live list of searchable elements. */
	items: () => HTMLElement[]
	/** Label text for an item. */
	text?: (item: HTMLElement) => string
	/** Buffer reset delay in ms. */
	delay?: () => number
	/** Applies a matching item. */
	onMatch: (item: HTMLElement, event: KeyboardEvent) => void
}) => {
	const inert = {
		handle: (_event: KeyboardEvent) => false,
		reset() {},
	}

	if (!dom(host)) return inert

	const resetter = timer(host)
	let query = ''

	const reset = () => {
		query = ''
		resetter.stop()
	}

	return {
		handle(event: KeyboardEvent) {
			if (!printable(event)) return false

			query = `${query}${event.key}`.toLowerCase()
			resetter.start(opts.delay?.() ?? 600, () => query = '')

			const text = opts.text ?? label
			const match = opts.items().find(item => text(item).toLowerCase().startsWith(query))
			if (match) opts.onMatch(match, event)
			return true
		},
		reset,
	}
}
