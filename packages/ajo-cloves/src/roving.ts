import type { Host } from 'ajo'
import { dom } from './core'

type RovingStep = number | 'first' | 'last'
type RovingOrientation = 'horizontal' | 'vertical'

const keyStep = (event: KeyboardEvent, orientation: RovingOrientation, dir: 'ltr' | 'rtl'): RovingStep | undefined => {
	if (event.key === 'Home') return 'first'
	if (event.key === 'End') return 'last'

	if (orientation === 'vertical') {
		if (event.key === 'ArrowUp') return -1
		if (event.key === 'ArrowDown') return 1
		return undefined
	}

	if (event.key === 'ArrowLeft') return dir === 'rtl' ? 1 : -1
	if (event.key === 'ArrowRight') return dir === 'rtl' ? -1 : 1
	return undefined
}

/** List keyboard navigation: resolves arrow/Home/End movement over items; consumers apply focus or virtual effects. */
export const roving = (host: Host, opts: {
	/** Live list of navigable elements, in visual order. */
	items: () => HTMLElement[]
	/** Axis whose arrow keys move the active item. */
	orientation?: () => RovingOrientation
	/** Text direction for horizontal arrows. */
	dir?: () => 'ltr' | 'rtl'
	/** Wrap at the ends. */
	loop?: () => boolean
	/** Element the next move starts from. */
	current?: () => HTMLElement | null | undefined
	/** Applies the movement. */
	onMove: (target: HTMLElement, event: KeyboardEvent) => void
}) => {
	if (!dom(host)) return { handle: (_event: KeyboardEvent) => false }

	return {
		// A recognized navigation key is always consumed when there are items,
		// even when a loopless boundary produces no movement (no scroll fallthrough).
		handle(event: KeyboardEvent) {
			const step = keyStep(event, opts.orientation?.() ?? 'vertical', opts.dir?.() ?? 'ltr')
			if (step == null) return false

			const list = opts.items()
			if (!list.length) return false

			event.preventDefault()

			const last = list.length - 1
			const index = list.indexOf((opts.current?.() ?? host.ownerDocument.activeElement) as HTMLElement)
			const edge = (start: boolean) => list[start ? 0 : last]
			const target = step === 'first' || step === 'last'
				? edge(step === 'first')
				: index < 0
					? edge(step > 0)
					: list[index + step] ?? ((opts.loop?.() ?? true) ? edge(step > 0) : undefined)

			if (target) opts.onMove(target, event)
			return true
		},
	}
}
