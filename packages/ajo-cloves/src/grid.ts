import type { Host } from './core'

/** Semantic 2D keyboard movement resolved from grid navigation keys. */
export type GridMove =
	| { cols: number }
	| { rows: number }
	| { edge: 'start' | 'end'; extent: 'row' | 'all' }
	| { page: number; large: boolean }

const move = (event: KeyboardEvent, rtl: boolean): GridMove | undefined => {
	if (event.key === 'ArrowLeft') return { cols: rtl ? 1 : -1 }
	if (event.key === 'ArrowRight') return { cols: rtl ? -1 : 1 }
	if (event.key === 'ArrowUp') return { rows: -1 }
	if (event.key === 'ArrowDown') return { rows: 1 }
	if (event.key === 'Home') return { edge: 'start', extent: event.ctrlKey ? 'all' : 'row' }
	if (event.key === 'End') return { edge: 'end', extent: event.ctrlKey ? 'all' : 'row' }
	if (event.key === 'PageUp') return { page: -1, large: event.shiftKey }
	if (event.key === 'PageDown') return { page: 1, large: event.shiftKey }
	return undefined
}

/**
 * 2D grid keyboard navigation: resolves arrows/Home/End/PageUp/PageDown to semantic movement.
 *
 * The host parameter keeps the clove signature uniform; grid holds no
 * per-host state and needs no cleanup.
 *
 * @example
 * ```ts
 * const nav = grid(this, { onMove: move => focusCell(move) })
 * ```
 */
export const grid = (host: Host, opts: {
	/** Right-to-left column direction. Default: false. */
	rtl?: () => boolean
	/** Receives the semantic movement resolved from a handled keydown. */
	onMove: (move: GridMove, event: KeyboardEvent) => void
}) => {
	void host

	return {
		/** Routes a keydown. Returns true and prevents default for grid navigation keys. */
		handle(event: KeyboardEvent): boolean {
			const next = move(event, opts.rtl?.() ?? false)
			if (!next) return false

			event.preventDefault()
			opts.onMove(next, event)
			return true
		},
	}
}
