import type { Host } from 'ajo-cloves'
import { controlled, dom, roving, typeahead } from 'ajo-cloves'

export type BarView = {
	/** Open trigger value; '' = every surface closed. */
	readonly value: string
	/** Stored roving tab-stop value; '' = defer to DOM order. */
	readonly focused: string
	/** Reads controlled/uncontrolled value for this render; call once per render pass. */
	sync(value: string | undefined): string
	/** Opens a value, or closes everything with ''. */
	setValue(next: string, event?: Event): void
	close(event?: Event): void
	/** Follow policy: while the bar is open, moves the open value to the entered trigger; inert while closed. */
	follow(next: string, event?: Event): void
	/** Focus policy: adopts the roving tab stop, and follows while the bar is open. */
	focus(next: string, event?: Event): void
	/** Seeds the tab stop without invalidating (registration repair). */
	adopt(next: string): void
	/** Single tab stop: true when the value holds it, resolved against the live row. */
	isTabbable(value: string): boolean
	/** Trigger-row keydown skeleton: roving arrows, typeahead, and Escape gated on open. */
	handle(event: KeyboardEvent): boolean
}

export type BarOptions = {
	/** Live enabled trigger row, in DOM order. */
	triggers: () => HTMLElement[]
	/** Bar value of one trigger. Default: dataset.value. */
	value?: (trigger: HTMLElement) => string
	/** Value before the first sync; '' = closed. */
	initialValue?: string
	/** Blocks opening while true. */
	disabled?: () => boolean
	/** Wrap arrow navigation at the ends. Default: true. */
	loop?: () => boolean
	/** Called whenever the open value changes. */
	onValueChange?: (value: string, event?: Event) => void
}

/**
 * The shared root machine for horizontal trigger bars (menubar,
 * navigation-menu): one controlled open value ('' = closed), roving over a
 * live trigger row with typeahead, and the open-follows-focus/hover policy.
 *
 * Movement (arrows, typeahead) only focuses the target trigger; the follow
 * policy runs exactly once through the trigger's own focus handler, so
 * controlled consumers see a single onValueChange per move.
 */
export const bar = (host: Host, opts: BarOptions): BarView => {
	const read = opts.value ?? ((trigger: HTMLElement) => trigger.dataset.value ?? '')
	const state = controlled<string>(host, {
		fallback: opts.initialValue ?? '',
		onChange: opts.onValueChange,
	})
	let focused = ''

	// The tab stop resolves against the live row: a stale, removed, or
	// disabled entry falls back to the first trigger in DOM order.
	const stop = () => {
		if (!dom(host)) return ''
		const row = opts.triggers()
		if (!row.length) return ''
		return focused && row.some(trigger => read(trigger) === focused) ? focused : read(row[0])
	}

	const setValue = (next: string, event?: Event) => {
		if (next && opts.disabled?.()) return
		if (next === state.value) return
		if (next) focused = next
		state.set(next, event)
	}

	let following = false

	const follow = (next: string, event?: Event) => {
		if (following) return
		if (!state.value || !next || next === state.value) return

		following = true
		try {
			// When focus sits inside the surface about to close (a DOM
			// descendant of the bar that is not a row trigger), move it onto
			// the followed trigger first: hiding a native popover restores
			// focus to its invoker, which would re-run the follow policy and
			// bounce the open value straight back.
			if (dom(host)) {
				const row = opts.triggers()
				const target = row.find(trigger => read(trigger) === next)
				const active = document.activeElement as HTMLElement | null
				if (target && active && active !== target && (host as unknown as HTMLElement).contains(active) && !row.includes(active)) {
					target.focus()
				}
			}
			setValue(next, event)
		} finally {
			following = false
		}
	}

	const nav = roving(host, {
		items: opts.triggers,
		orientation: () => 'horizontal',
		loop: () => opts.loop?.() ?? true,
		// Focus only: the focus event runs the follow policy once.
		onMove: target => target.focus(),
	})

	const ta = typeahead(host, {
		items: opts.triggers,
		onMatch: (target, event) => {
			event.preventDefault()
			target.focus()
		},
	})

	return {
		get value() {
			return state.value
		},
		get focused() {
			return focused
		},
		sync: value => state.sync(value),
		setValue,
		close: event => setValue('', event),
		follow,
		focus(next, event) {
			if (state.value && next && next !== state.value) {
				follow(next, event)
			} else if (focused !== next) {
				focused = next
				host.next()
			}
		},
		adopt(next) {
			focused = next
		},
		isTabbable(value) {
			const current = stop()
			return !current || current === value
		},
		handle(event) {
			if (nav.handle(event)) return true

			if (event.key === 'Escape') {
				if (!state.value) return false
				event.preventDefault()
				setValue('', event)
				return true
			}

			return ta.handle(event)
		},
	}
}
