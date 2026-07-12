import type { Host } from 'ajo-cloves'
import { anchor, callRef, controlled, dismiss, hover, id } from 'ajo-cloves'
import { closePopover as hidePopover, openPopover as showPopover } from './utils'

export type FloatingSide = 'bottom' | 'left' | 'right' | 'top'
export type FloatingAlign = 'center' | 'end' | 'start'
export type FloatingConstrain = 'height' | 'width' | 'both' | 'none'

export type FloatingPlacement = {
	/** Preferred side. */
	side?: () => FloatingSide
	/** Cross-axis alignment. */
	align?: () => FloatingAlign
	/** Gap between anchor and content in px. */
	sideOffset?: () => number
	/** Shift along the alignment axis in px. */
	alignOffset?: () => number
	/** Minimum distance from viewport edges in px. */
	padding?: () => number
	/** Writes maxHeight/maxWidth from available space. */
	constrain?: () => FloatingConstrain
}

type DatasetPlacementDefaults = {
	side: FloatingSide
	align: FloatingAlign
	sideOffset: number
	alignOffset?: number
	padding: number
	constrain?: FloatingConstrain
}

/** Reads live placement data from floating content, falling back to one family's defaults. */
export const datasetPlacement = (
	content: () => HTMLElement | null | undefined,
	defaults: DatasetPlacementDefaults,
): FloatingPlacement => {
	const placement: FloatingPlacement = {
		side: () => (content()?.dataset.sidePreference as FloatingSide) || defaults.side,
		align: () => (content()?.dataset.align as FloatingAlign) || defaults.align,
		sideOffset: () => Number(content()?.dataset.sideOffset ?? defaults.sideOffset),
		alignOffset: () => Number(content()?.dataset.alignOffset ?? defaults.alignOffset ?? 0),
		padding: () => Number(content()?.dataset.collisionPadding ?? defaults.padding),
	}
	const constrain = defaults.constrain
	if (constrain) placement.constrain = () => constrain
	return placement
}

/** Inline style undoing the UA popover stylesheet defaults, plus extra declarations. */
export const popupStyle = (...parts: unknown[]) =>
	['inset:auto', 'margin:0', ...parts.filter((part): part is string => typeof part === 'string' && part.length > 0)].join(';')

type ContentAttrsOptions<Element extends HTMLElement> = {
	align: FloatingAlign
	alignOffset?: number
	collisionPadding?: number
	id?: unknown
	open?: boolean
	popover?: unknown
	ref?: unknown
	setContent?: (element: Element | null) => void
	side: FloatingSide
	sideOffset: number
	style?: unknown
	tabindex?: number | string
}

/** Builds the placement/native-popover attrs and composed ref shared by floating content. */
export const contentAttrs = <Element extends HTMLElement>(options: ContentAttrsOptions<Element>): Record<string, unknown> => {
	const {
		align,
		alignOffset = 0,
		collisionPadding,
		id,
		open,
		popover,
		ref,
		setContent,
		side,
		sideOffset,
		style,
		tabindex,
	} = options
	const attrs: Record<string, unknown> = {
		'data-align': align,
		'data-align-offset': alignOffset,
		'data-side-offset': sideOffset,
		'data-side-preference': side,
		style: popupStyle(style),
	}
	if ('collisionPadding' in options) attrs['data-collision-padding'] = collisionPadding
	if ('open' in options) attrs['data-state'] = open ? 'open' : 'closed'
	if ('id' in options) attrs.id = id
	if ('popover' in options) attrs.popover = popover
	if ('tabindex' in options) attrs.tabindex = tabindex
	if ('ref' in options || 'setContent' in options) {
		attrs.ref = (element: Element | null) => {
			setContent?.(element)
			callRef(ref, element)
		}
	}
	return attrs
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

/** Builds the state, popup relation, id, and composed ref shared by popup triggers. */
export const triggerAttrs = <Element extends HTMLElement>(options: TriggerAttrsOptions<Element>): Record<string, unknown> => {
	const { controls, describedby, expanded, haspopup, id, open, ref, setTrigger, triggerId } = options
	const attrs: Record<string, unknown> = {
		'data-state': open ? 'open' : 'closed',
	}
	if ('controls' in options) attrs['aria-controls'] = controls
	if ('describedby' in options) attrs['aria-describedby'] = describedby
	if ('expanded' in options) attrs['aria-expanded'] = expanded ? 'true' : 'false'
	if ('haspopup' in options) attrs['aria-haspopup'] = haspopup
	const resolvedId = id ?? triggerId
	if ('id' in options || 'triggerId' in options) attrs.id = resolvedId
	if ('ref' in options || 'setTrigger' in options) {
		attrs.ref = (element: Element | null) => {
			setTrigger?.(element)
			callRef(ref, element)
		}
	}
	return attrs
}

export type SurfaceView = {
	/** Repositions now. */
	place(): void
	/** Marks open, shows the native popover, and places it pre-paint. */
	show(source?: HTMLElement | null): void
	/** Marks closed, stops watching, and hides the native popover. */
	hide(): void
}

/** Positioning plus native-popover show/hide for one floating element; open state stays with the caller. */
export const surface = (host: Host, opts: {
	/** Reference element. */
	anchor: () => HTMLElement | null | undefined
	/** Floating element. */
	target: () => HTMLElement | null | undefined
	/** Caret element inside the target; the placer pins it to the edge nearest the anchor. */
	arrow?: () => HTMLElement | null | undefined
	placement: FloatingPlacement
}): SurfaceView => {
	// Lazy so consumer placement closures may reference their own view binding.
	let pos: ReturnType<typeof anchor> | undefined

	const position = () =>
		pos ??= anchor(host, { anchor: opts.anchor, target: opts.target, arrow: opts.arrow, ...opts.placement })

	return {
		place: () => position().place(),
		show(source) {
			const target = opts.target()
			if (!target) return

			target.dataset.state = 'open'
			// The caret straddles the target edge, so the UA popover stylesheet's
			// overflow:auto would clip its protruding half. Content that must
			// scroll needs an inner scroll container while it has an arrow.
			if (opts.arrow?.()) target.style.overflow = 'visible'
			showPopover(target, source ?? opts.anchor() ?? undefined)
			position().place()
			position().watch()
		},
		hide() {
			const target = opts.target()
			if (!target) return

			target.dataset.state = 'closed'
			pos?.unwatch()
			hidePopover(target)
		},
	}
}

export type FloatingView<Trigger extends HTMLElement = HTMLElement, Content extends HTMLElement = HTMLDivElement> = {
	readonly open: boolean
	readonly trigger: Trigger | null
	readonly content: Content | null
	readonly anchor: HTMLElement | null
	readonly triggerId: string
	readonly contentId: string
	/** Reads controlled/uncontrolled open state for this render; call once per render pass. */
	sync(open: boolean | null | undefined): boolean
	setOpen(open: boolean, event?: Event): void
	/** Seeds the uncontrolled open state without notifying onOpenChange. */
	init(open: boolean): void
	close(event?: Event): void
	/** Holds a hover zone open (hover option only). */
	hold(zone: string, event: Event): void
	/** Releases a hover zone (hover option only). */
	release(zone: string, event: Event): void
	/** Cancels pending hover open/close timers. */
	cancelHover(): void
	setTrigger(element: Trigger | null): void
	setContent(element: Content | null): void
	/** Registers the anchor override; re-places while open so a swapped anchor lands positioned. */
	setAnchor(element: HTMLElement | null): void
	/**
	 * Registers the arrow/caret element and re-places while open so a late
	 * arrow lands positioned. The content's overflow becomes visible so the
	 * caret's protruding half paints (scrollable content needs an inner scroll
	 * container); null unregisters and restores the content's overflow.
	 */
	setArrow(element: HTMLElement | null): void
	/** Unregisters `element` only while it is the registered arrow, so a replaced arrow's unmount cannot clear the live one. */
	clearArrow(element: HTMLElement): void
	place(): void
}

export type FloatingOptions<View> = {
	/** Prefix for the generated trigger/content ids. */
	prefix: string
	/** Open state before the first sync. */
	initialOpen: boolean
	/** Blocks opening while true. */
	disabled?: () => boolean
	/** Mirror native popover toggle events (light dismiss) back into open state. Default: true. */
	echo?: boolean
	/** Hover-intent zones that hold the surface open. */
	hover?: {
		openDelay: () => number
		closeDelay: () => number
	}
	/** Called whenever open state changes. */
	onOpenChange?: (open: boolean, event?: Event) => void
	/** Called synchronously when setOpen commits a change. */
	onSetOpen?: (open: boolean, event: Event | undefined, view: View) => void
	/** Called in the sync microtask after the surface was shown and placed, or hidden. */
	onSync?: (open: boolean, view: View) => void
	/** Overrides the anchor reference. Default: the registered trigger. */
	reference?: (view: View) => HTMLElement | null
	placement: FloatingPlacement
	dismiss?: {
		prevent?: boolean
		escape?: boolean
		outside?: boolean
		inside?: (view: View) => (Element | null | undefined)[]
		onDismiss?: (event: Event, view: View) => void
	}
}

/**
 * The popup engine: controlled open state, ids, anchored positioning, native
 * popover show/hide with toggle echo, optional hover intent, and dismissal.
 * Consumers must call view.sync(open) once per render pass.
 */
export const floating = <
	Trigger extends HTMLElement = HTMLElement, Content extends HTMLElement = HTMLDivElement,
	View extends FloatingView<Trigger, Content> = FloatingView<Trigger, Content>,
>(host: Host, opts: FloatingOptions<View>): View => {
	const rootId = id(opts.prefix)
	let contentId = `${rootId}-content`
	const watched = new WeakSet<HTMLElement>()
	const state = controlled<boolean>(host, {
		fallback: opts.initialOpen,
		onChange: opts.onOpenChange,
	})
	let anchorElement: HTMLElement | null = null
	let arrowElement: HTMLElement | null = null
	let content: Content | null = null
	let opened = state.value
	let syncing = false, triggerId = `${rootId}-trigger`
	let trigger: Trigger | null = null
	let view: View

	const reference = () => opts.reference?.(view) ?? trigger

	const pane = surface(host, {
		anchor: reference,
		target: () => content,
		arrow: () => arrowElement,
		placement: opts.placement,
	})

	const intent = opts.hover ? hover(host, {
		openDelay: opts.hover.openDelay,
		closeDelay: opts.hover.closeDelay,
		onChange: (next, event) => setOpen(next, event),
	}) : undefined

	const sync = () => queueMicrotask(() => {
		if (!content) return
		syncing = true
		if (opened) pane.show(reference())
		else pane.hide()
		opts.onSync?.(opened, view)
		queueMicrotask(() => syncing = false)
	})

	const setOpen = (next: boolean, event?: Event) => {
		if (opts.disabled?.() && next) return
		if (next === opened) return

		state.set(next, event)
		opts.onSetOpen?.(next, event, view)
		opened = state.value
		intent?.sync(opened)
		sync()
	}

	view = {
		get open() { return opened },
		get trigger() { return trigger },
		get content() { return content },
		get anchor() { return anchorElement },
		get triggerId() { return triggerId },
		get contentId() { return contentId },
		sync(open: boolean | null | undefined) {
			// Open is boolean-only: null keeps meaning uncontrolled here even
			// though the controlled clove now binds null (controlled-empty).
			opened = state.sync(open ?? undefined)
			intent?.sync(opened)
			sync()
			return opened
		},
		setOpen,
		init(open: boolean) {
			if (state.controlled || open === opened) return

			state.init(open)
			opened = open
			intent?.sync(opened)
			sync()
		},
		close: (event?: Event) => setOpen(false, event),
		hold(zone: string, event: Event) {
			if (!opts.disabled?.()) intent?.hold(zone, event)
		},
		release(zone: string, event: Event) {
			intent?.release(zone, event)
		},
		cancelHover() {
			intent?.cancel()
		},
		setTrigger(element: Trigger | null) {
			trigger = element
			if (element?.id && element.id !== triggerId) {
				triggerId = element.id
				queueMicrotask(() => host.next())
			}
		},
		setContent(element: Content | null) {
			content = element
			if (element?.id && element.id !== contentId) {
				contentId = element.id
				queueMicrotask(() => host.next())
			}
			if (!element || opts.echo === false || watched.has(element)) return

			watched.add(element)
			element.addEventListener('toggle', (event: Event) => {
				if (syncing) return
				const next = (event as Event & { newState?: string }).newState === 'open'
				if (next !== opened) {
					state.accept(next, event)
					opened = state.value
					intent?.sync(opened)
					sync()
				}
			}, { signal: host.signal })
		},
		setAnchor(element: HTMLElement | null) {
			if (element === anchorElement) return

			anchorElement = element
			if (element && opened) pane.place()
		},
		setArrow(element: HTMLElement | null) {
			if (element === arrowElement) return

			// A replaced arrow may stay mounted (a themed auto caret beside a
			// manual one); hide it so only the registered, placed caret paints.
			if (element && arrowElement?.isConnected) arrowElement.style.visibility = 'hidden'
			arrowElement = element

			if (element) {
				element.style.visibility = ''
				if (content) content.style.overflow = 'visible'
				if (opened) pane.place()
			} else if (content) content.style.overflow = ''
		},
		clearArrow(element: HTMLElement) {
			if (element === arrowElement) view.setArrow(null)
		},
		place: () => pane.place(),
	} as unknown as View

	if (opts.dismiss) dismiss(host, {
			active: () => opened,
			inside: () => opts.dismiss?.inside?.(view) ?? [trigger, content],
			prevent: opts.dismiss.prevent,
			escape: opts.dismiss.escape,
			outside: opts.dismiss.outside,
			onDismiss: event => opts.dismiss?.onDismiss ? opts.dismiss.onDismiss(event, view) : view.close(event),
		})

	return view
}
