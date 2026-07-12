import type { Host } from './core'
import { dom } from './core'

type RovingStep = number | 'first' | 'last'
type RovingOrientation = 'horizontal' | 'vertical' | 'both'

const keyStep = (event: KeyboardEvent, orientation: RovingOrientation, dir: 'ltr' | 'rtl'): RovingStep | undefined => {
	if (event.key === 'Home') return 'first'
	if (event.key === 'End') return 'last'

	if (orientation === 'vertical' || orientation === 'both') {
		if (event.key === 'ArrowUp') return -1
		if (event.key === 'ArrowDown') return 1
	}

	if (orientation === 'horizontal' || orientation === 'both') {
		if (event.key === 'ArrowLeft') return dir === 'rtl' ? 1 : -1
		if (event.key === 'ArrowRight') return dir === 'rtl' ? -1 : 1
	}

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
	const inert = {
		handle: (_event: KeyboardEvent) => false,
		move: (_step: RovingStep, _event: KeyboardEvent) => false,
	}

	if (!dom(host)) return inert

	const move = (step: RovingStep, event: KeyboardEvent) => {
		const list = opts.items()
		if (!list.length) return false

		const active = opts.current?.() ?? document.activeElement
		const index = Math.max(0, list.indexOf(active as HTMLElement))
		const target = step === 'first'
			? list[0]
			: step === 'last'
				? list[list.length - 1]
				: list[index + step] ?? ((opts.loop?.() ?? true) ? list[step > 0 ? 0 : list.length - 1] : undefined)

		if (!target) return false

		opts.onMove(target, event)
		return true
	}

	return {
		// A recognized navigation key is always consumed when there are items,
		// even when a loopless boundary produces no movement (no scroll fallthrough).
		handle(event: KeyboardEvent) {
			const step = keyStep(event, opts.orientation?.() ?? 'vertical', opts.dir?.() ?? 'ltr')
			if (step == null || !opts.items().length) return false

			event.preventDefault()
			move(step, event)
			return true
		},
		move,
	}
}
