import type { Host } from './core'
import { dom, on } from './core'

const modifier = (token: string) =>
	token === 'mod' || token === 'ctrl' || token === 'meta' || token === 'alt' || token === 'shift'

const matches = (chord: string, event: KeyboardEvent) => {
	const tokens = chord
		.split('+')
		.map(token => token.trim().toLowerCase())
		.filter(Boolean)
	const key = tokens.find(token => !modifier(token))

	if (!key) return false

	const wantsMod = tokens.includes('mod')
	const wantsCtrl = tokens.includes('ctrl')
	const wantsMeta = tokens.includes('meta')
	const wantsAlt = tokens.includes('alt')
	const wantsShift = tokens.includes('shift')
	const ctrl = event.ctrlKey
	const meta = event.metaKey

	if (wantsMod) {
		if (ctrl === meta) return false
	} else {
		if (ctrl !== wantsCtrl || meta !== wantsMeta) return false
	}

	if (event.altKey !== wantsAlt) return false
	if (event.shiftKey !== wantsShift) return false

	return event.key.toLowerCase() === key
}

/** Global keyboard shortcut for a single chord like 'mod+b' or 'F8'. */
export const hotkey = (host: Host, opts: {
	/** Chord: '+'-separated modifiers (mod|ctrl|meta|alt|shift) plus one key token, e.g. 'mod+b', 'F8'. */
	keys: () => string
	/** Called when the active chord matches a keydown. */
	onPress: (event: KeyboardEvent) => void
	/** Gate. Default: () => true. */
	active?: () => boolean
	/** preventDefault on match. Default: true. */
	prevent?: boolean
}): void => {
	if (!dom(host)) return

	on(window, 'keydown', event => {
		if (!matches(opts.keys(), event)) return
		if (!(opts.active?.() ?? true)) return

		if (opts.prevent ?? true) event.preventDefault()
		opts.onPress(event)
	}, host)
}
