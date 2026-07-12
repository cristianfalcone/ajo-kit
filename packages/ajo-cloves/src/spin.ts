import type { Host } from './core'

/** Semantic spinbutton movement resolved from stepping keys. */
export type SpinMove =
	| { step: 1 | -1 }
	| { page: 1 | -1 }
	| { edge: 'min' | 'max' }

const move = (event: KeyboardEvent): SpinMove | undefined => {
	if (event.key === 'ArrowUp') return { step: 1 }
	if (event.key === 'ArrowDown') return { step: -1 }
	if (event.key === 'PageUp') return { page: 1 }
	if (event.key === 'PageDown') return { page: -1 }
	if (event.key === 'Home') return { edge: 'min' }
	if (event.key === 'End') return { edge: 'max' }
	return undefined
}

/**
 * Spinbutton keyboard stepping: resolves ArrowUp/ArrowDown/PageUp/PageDown/Home/End to semantic movement.
 *
 * The host parameter keeps the clove signature uniform; spin holds no
 * per-host state and needs no cleanup. Aria and value state stay in the
 * consumer; composes with roving when the consumer dispatches spin first.
 *
 * @example
 * ```ts
 * const stepper = spin(this, { onMove: move => stepValue(move) })
 * ```
 */
export const spin = (host: Host, opts: {
	/** Receives the semantic movement resolved from a handled keydown. */
	onMove: (move: SpinMove, event: KeyboardEvent) => void
}) => {
	void host

	return {
		/** Routes a keydown. Returns true and prevents default for spin keys. */
		handle(event: KeyboardEvent): boolean {
			const next = move(event)
			if (!next) return false

			event.preventDefault()
			opts.onMove(next, event)
			return true
		},
	}
}
