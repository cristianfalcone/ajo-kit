import type { Host } from 'ajo'
import { callRef, controlled, dismiss, hover, id, resize } from 'ajo-cloves'
import { closePopover, openPopover, popoverOpen } from './native'
import { position, type PositionProfile, type PositionReference } from './position'

/** Logical placement shared by Ajo popup roots. */
export type PopupPlacement =
	| 'top' | 'top-start' | 'top-end'
	| 'right' | 'right-start' | 'right-end'
	| 'bottom' | 'bottom-start' | 'bottom-end'
	| 'left' | 'left-start' | 'left-end'
	| 'auto'

/** Small semantic positioning contract shared by Ajo popup roots. */
export type PopupPosition = {
	/** Preferred logical placement; auto chooses the most available space. */
	placement?: PopupPlacement
	/** Distance between the reference and floating box, in CSS pixels. */
	gap?: number
}

type TriggerAttrsOptions<Element extends HTMLElement> = {
	controls?: string
	describedby?: string
	expanded?: boolean
	haspopup?: 'dialog' | 'listbox' | 'menu'
	id?: unknown
	open: boolean
	ref?: unknown
	setTrigger?: (element: Element | null) => void
	triggerId?: string
}

/** Builds state, popup relations, ids and a composed trigger ref. */
export const triggerAttrs = <Element extends HTMLElement>(options: TriggerAttrsOptions<Element>): Record<string, unknown> => {
	const { controls, describedby, expanded, haspopup, id, open, ref, setTrigger, triggerId } = options
	const attrs: Record<string, unknown> = { 'data-state': open ? 'open' : 'closed' }
	if ('controls' in options) attrs['aria-controls'] = controls
	if ('describedby' in options) attrs['aria-describedby'] = describedby
	if ('expanded' in options) attrs['aria-expanded'] = expanded ? 'true' : 'false'
	if ('haspopup' in options) attrs['aria-haspopup'] = haspopup
	if ('id' in options || 'triggerId' in options) attrs.id = id ?? triggerId
	if ('ref' in options || 'setTrigger' in options) {
		attrs.ref = (element: Element | null) => {
			setTrigger?.(element)
			callRef(ref, element)
		}
	}
	return attrs
}

/** Inline reset for a native popover plus caller-owned declarations. */
export const popupStyle = (...parts: unknown[]) =>
	['inset:auto', 'margin:0', ...parts.filter((part): part is string => typeof part === 'string' && part.length > 0)].join(';')

type ContentAttrsOptions<Element extends HTMLElement> = {
	id?: unknown
	open?: boolean
	ref?: unknown
	setContent?: (element: Element | null) => void
	style?: unknown
	tabindex?: number | string
}

/** Builds native/manual popup attrs and a composed content ref. */
export const contentAttrs = <Element extends HTMLElement>({ id, open, ref, setContent, style, tabindex }: ContentAttrsOptions<Element>): Record<string, unknown> => ({
	popover: 'manual',
	style: typeof style === 'string' ? style : popupStyle(),
	id,
	'data-state': open ? 'open' : 'closed',
	tabindex,
	ref: (element: Element | null) => {
		setContent?.(element)
		callRef(ref, element)
	},
})

export type PopupView<Trigger extends HTMLElement = HTMLElement, Content extends HTMLElement = HTMLDivElement> = {
	readonly open: boolean
	readonly trigger: Trigger | null
	readonly content: Content | null
	readonly reference: PositionReference | null
	readonly triggerId: string
	readonly contentId: string
	/** Adopts the trigger's rendered id synchronously, or restores the generated id. */
	adoptTriggerId(id?: unknown): string
	/** Renders the caller's declarations; popup re-applies its own state when they change. */
	contentStyle(style?: unknown): string
	/** Owns the internal arrow probe's stable ref. */
	arrowAttrs(): {
		ref: (element: HTMLElement | null) => void
	}
	/** Reads controlled state and current root positioning once per render. */
	sync(open: boolean | null | undefined, position?: PopupPosition): boolean
	setOpen(open: boolean, event?: Event): void
	/** Seeds uncontrolled state without notifying onOpenChange. */
	init(open: boolean): void
	/** Closes; when given, `restore` gets focus in a microtask if the surface stays closed and it is still connected. */
	close(event?: Event, restore?: HTMLElement | null): void
	/** Runs fn once the next opening or retarget is revealed, at once when already revealed; closing or a new reference drops it. */
	focusAfterReveal(fn: () => void): void
	hold(zone: string, event: Event): void
	release(zone: string, event: Event): void
	cancelHover(): void
	setTrigger(element: Trigger | null): void
	setContent(element: Content | null): void
	setReference(element: PositionReference | null): void
	/** Requests a coalesced geometry update for a proven manual case. */
	update(): void
}

export type PopupOptions<View> = {
	prefix: string
	profile: Exclude<PositionProfile, 'chart'>
	initialOpen: boolean
	disabled?: () => boolean
	hover?: {
		openDelay: () => number
		closeDelay: () => number
	}
	onOpenChange?: (open: boolean, event?: Event) => void
	/** Runs after current first geometry commit or after synchronous close. */
	onSync?: (open: boolean, view: View) => void
	source?: (view: View) => HTMLElement | null
	boundary?: (view: View) => Element | null
	/** Optional parent clip used only by reference-hidden detection. */
	referenceBoundary?: (view: View) => Element | null
	referenceHidden?: 'close' | 'hide' | 'none'
	/** Refreshes native source identity when an open reference tuple changes. */
	reopenOnReferenceChange?: boolean
	dismiss?: {
		prevent?: boolean
		escape?: boolean
		outside?: boolean
		inside?: (view: View) => (Element | null | undefined)[]
		onDismiss?: (event: Event, view: View) => void
	}
}

const stacks = new WeakMap<Document, object[]>()
const handled = new WeakSet<Event>()

const stack = (element: HTMLElement) => {
	const document = element.ownerDocument
	let current = stacks.get(document)
	if (!current) stacks.set(document, current = [])
	return current
}

const remove = (view: object, element: HTMLElement | null) => {
	if (!element) return
	const current = stack(element)
	const index = current.indexOf(view)
	if (index >= 0) current.splice(index, 1)
}

const push = (view: object, element: HTMLElement) => {
	const current = stack(element)
	const index = current.indexOf(view)
	if (index >= 0) current.splice(index, 1)
	current.push(view)
}

const top = (view: object, element: HTMLElement | null) => {
	if (!element) return false
	const current = stack(element)
	return current[current.length - 1] === view
}

/** Private popup Module: Ajo interaction/native lifecycle over the position Adapter. */
export const popup = <
	Trigger extends HTMLElement = HTMLElement,
	Content extends HTMLElement = HTMLDivElement,
	View extends PopupView<Trigger, Content> = PopupView<Trigger, Content>,
>(host: Host, options: PopupOptions<View>): View => {
	const rootId = id(options.prefix)
	const contentId = `${rootId}-content`
	const state = controlled<boolean>(host, {
		fallback: options.initialOpen,
		onChange: options.onOpenChange,
	})
	let afterReveal: (() => void) | undefined
	let arrow: HTMLElement | null = null
	let callerStyle: unknown
	let concealed = false
	let content: Content | null = null
	let opened = state.value
	let preferred: PopupPosition = {}
	let referenceElement: PositionReference | null = null
	let referenceIsHidden = false
	let shown = false
	let trigger: Trigger | null = null
	const generatedTriggerId = `${rootId}-trigger`
	let triggerId = generatedTriggerId
	let version = 0
	let view: View
	let opening = false
	let reopen = false
	let restyling = false
	let scheduled = false

	const conceal = (target: Content, hidden: boolean) => {
		concealed = hidden
		if (hidden) {
			target.style.setProperty('visibility', 'hidden', 'important')
			target.style.setProperty('pointer-events', 'none', 'important')
		} else {
			target.style.removeProperty('visibility')
			target.style.removeProperty('pointer-events')
		}
	}

	const reference = () => referenceElement ?? trigger
	const connectedSource = (element: HTMLElement | null | undefined) => element?.isConnected ? element : null
	const source = () => connectedSource(options.source?.(view)) ?? connectedSource(trigger)
	const reveal = (target: Content) => {
		conceal(target, options.referenceHidden === 'hide' && referenceIsHidden)
	}

	const geometry = position(host, {
		profile: options.profile,
		elements: () => ({ reference: reference(), floating: content, arrow }),
		placement: () => preferred.placement,
		gap: () => preferred.gap,
		boundary: () => options.boundary?.(view) ?? null,
		referenceBoundary: () => options.referenceBoundary?.(view) ?? null,
		referenceHidden(hidden) {
			referenceIsHidden = hidden
			if (!content) return
			if (options.referenceHidden === 'hide') {
				if (hidden || shown) conceal(content, hidden)
			} else if (hidden && options.referenceHidden === 'close') {
				view.close()
			}
		},
	})

	const intent = options.hover ? hover(host, {
		openDelay: options.hover.openDelay,
		closeDelay: options.hover.closeDelay,
		onChange: (next, event) => setOpen(next, event),
	}) : undefined

	const closeCurrent = (target = content, notify = true) => {
		const wasShown = shown
		if (target) target.dataset.state = 'closed'
		version++
		geometry.stop()
		remove(view, target)
		shown = false
		afterReveal = undefined
		referenceIsHidden = false
		if (!target) return
		conceal(target, false)
		closePopover(target)
		if (wasShown && notify) options.onSync?.(false, view)
	}

	const openCurrent = async () => {
		const target = content
		const currentReference = reference()
		if (!target || !opened || host.signal.aborted) return false
		if (!currentReference) {
			view.close()
			return false
		}
		const wasShown = shown
		const wasNativeOpen = popoverOpen(target)
		const token = ++version
		if (!wasShown) target.dataset.state = 'closed'
		conceal(target, true)

		let ready = false
		try {
			openPopover(target, source())
			if (!wasNativeOpen) push(view, target)
			ready = await geometry.start() &&
				token === version &&
				opened &&
				content === target &&
				popoverOpen(target)
		} finally {
			// A replaced content was already closed by setContent; a pending
			// reopen keeps the surface concealed for the next pass.
			if (!ready) {
				geometry.stop()
				if (content === target) {
					if (reopen) conceal(target, true)
					else if (opened) view.close()
					else closeCurrent(target)
				}
			}
		}
		if (!ready) return false

		shown = true
		target.dataset.state = 'open'
		reveal(target)
		const focus = afterReveal
		afterReveal = undefined
		focus?.()
		if (!wasShown) options.onSync?.(true, view)
		return true
	}

	const run = async () => {
		scheduled = false
		if (host.signal.aborted) {
			reopen = false
			return
		}
		if (opening) return
		opening = true
		try {
			do {
				reopen = false
				if (opened) await openCurrent()
				else closeCurrent()
			} while (reopen)
		} finally {
			opening = false
			if (reopen) schedule()
		}
	}

	function schedule() {
		if (host.signal.aborted) return
		reopen = true
		if (scheduled || opening) return
		scheduled = true
		queueMicrotask(() => {
			if (host.signal.aborted) {
				scheduled = false
				reopen = false
				return
			}
			void run().catch(report)
		})
	}

	const report = (error: unknown) => {
		if (host.signal.aborted) return
		queueMicrotask(() => {
			if (!host.signal.aborted) host.throw(error)
		})
	}

	const update = () => {
		if (!opened || host.signal.aborted) return
		if (!shown && !opening) {
			schedule()
			return
		}
		// An opening pass awaits the same coalesced task and handles its failure.
		const pending = geometry.update()
		if (!opening) void pending.catch(report)
	}

	const arrowSize = resize(host, {
		target: () => opened ? arrow : null,
		onResize: update,
	})

	const restart = (reopenSource = false) => {
		if (!opened || host.signal.aborted) return
		version++
		geometry.stop()
		referenceIsHidden = false
		if (content) {
			if (reopenSource) closePopover(content)
			conceal(content, true)
		}
		schedule()
	}

	// A new caller style replaced the attribute: re-apply the owned non-geometry
	// state (arrow overflow, concealment) and let geometry write itself again.
	const restyle = () => {
		restyling = false
		if (!content) return
		if (arrow) content.style.overflow = 'visible'
		if (concealed) conceal(content, true)
		update()
	}

	const setOpen = (next: boolean, event?: Event) => {
		if (host.signal.aborted) return
		if (options.disabled?.() && next) return
		if (next === opened) return
		state.set(next, event)
		opened = state.value
		intent?.sync(opened)
		arrowSize.sync()
		if (opened) schedule()
		else closeCurrent()
	}

	view = {
		get open() { return opened },
		get trigger() { return trigger },
		get content() { return content },
		get reference() { return referenceElement },
		get triggerId() { return triggerId },
		get contentId() { return contentId },
		adoptTriggerId(id) {
			triggerId = typeof id === 'string' && id ? id : generatedTriggerId
			return triggerId
		},
		contentStyle(style) {
			if (style !== callerStyle && !restyling) {
				restyling = true
				queueMicrotask(restyle)
			}
			callerStyle = style
			return popupStyle(style)
		},
		arrowAttrs() {
			return { ref: setArrow }
		},
		sync(open, next = {}) {
			const changed = preferred.placement !== next.placement || preferred.gap !== next.gap
			preferred = next
			const previous = opened
			opened = state.sync(open ?? undefined)
			intent?.sync(opened)
			arrowSize.sync()
			if (!opened) {
				if (previous || shown) closeCurrent()
			} else if (!shown && !opening) {
				schedule()
			} else if (changed) {
				update()
			}
			return opened
		},
		setOpen,
		init(open) {
			if (state.controlled || open === opened) return
			state.init(open)
			opened = open
			intent?.sync(opened)
			arrowSize.sync()
			if (opened) schedule()
			else closeCurrent()
		},
		close(event, restore) {
			const wasOpen = opened
			setOpen(false, event)
			if (!wasOpen || !restore) return
			const token = version
			queueMicrotask(() => {
				if (token === version && !opened && restore.isConnected) restore.focus()
			})
		},
		focusAfterReveal(fn) {
			if (!opened) return
			if (shown && !concealed) fn()
			else afterReveal = fn
		},
		hold(zone, event) {
			if (!options.disabled?.()) intent?.hold(zone, event)
		},
		release: (zone, event) => intent?.release(zone, event),
		cancelHover: () => intent?.cancel(),
		setTrigger(element) {
			if (element === trigger) return
			const previousReference = reference()
			const previousSource = source()
			trigger = element
			const referenceChanged = reference() !== previousReference
			const sourceChanged = source() !== previousSource
			if (!referenceChanged && !sourceChanged) return
			afterReveal = undefined
			restart(sourceChanged)
		},
		setContent(element) {
			if (element === content) return
			const previous = content
			if (previous) closeCurrent(previous, false)
			content = element
			if (element) {
				element.dataset.state = 'closed'
				if (arrow) element.style.overflow = 'visible'
			}
			if (opened) schedule()
		},
		setReference(element) {
			if (element === referenceElement) return
			const previousReference = reference()
			const previousSource = source()
			referenceElement = element
			const referenceChanged = reference() !== previousReference
			const sourceChanged = source() !== previousSource
			if (!referenceChanged && !sourceChanged) return
			afterReveal = undefined
			restart(sourceChanged || options.reopenOnReferenceChange)
		},
		update,
	} as View

	function setArrow(element: HTMLElement | null) {
		if (element === arrow) return
		arrow = element
		// Without a probe the caller's own overflow declaration applies again.
		if (content) {
			if (arrow) content.style.overflow = 'visible'
			else content.setAttribute('style', popupStyle(callerStyle))
		}
		arrowSize.sync()
		restart()
	}

	if (options.dismiss) dismiss(host, {
		active: () => opened && Boolean(content && popoverOpen(content)) && top(view, content),
		inside: () => options.dismiss?.inside?.(view) ?? [trigger, content],
		prevent: options.dismiss.prevent,
		escape: options.dismiss.escape,
		outside: options.dismiss.outside,
		onDismiss(event) {
			if (handled.has(event)) return
			handled.add(event)
			if (options.dismiss?.onDismiss) options.dismiss.onDismiss(event, view)
			else view.close(event)
		},
	})

	host.signal.addEventListener('abort', () => {
		opened = false
		reopen = false
		scheduled = false
		intent?.sync(false)
		closeCurrent(content, false)
	}, { once: true })
	return view
}
