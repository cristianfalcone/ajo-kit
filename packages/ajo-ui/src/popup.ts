import type { Host } from 'ajo-cloves'
import { callRef, controlled, dismiss, dom, hover, id, resize } from 'ajo-cloves'
import { closePopover, openPopover, popoverOpen } from './native'
import { position, type PositionProfile, type PositionReference } from './position'
import { popupStyle, type PopupPosition } from './utils'

type ContentAttrsOptions<Element extends HTMLElement> = {
	id?: unknown
	open?: boolean
	ref?: unknown
	setContent?: (element: Element | null) => void
	style?: unknown
	tabindex?: number | string
}

/** Builds native/manual popup attrs and a composed content ref. */
export const contentAttrs = <Element extends HTMLElement>(options: ContentAttrsOptions<Element>): Record<string, unknown> => {
	const { id, open, ref, setContent, style, tabindex } = options
	const attrs: Record<string, unknown> = {
		popover: 'manual',
		style: typeof style === 'string' ? style : popupStyle(),
	}
	if ('id' in options) attrs.id = id
	if ('open' in options) attrs['data-state'] = open ? 'open' : 'closed'
	if ('tabindex' in options) attrs.tabindex = tabindex
	if ('ref' in options || 'setContent' in options) {
		attrs.ref = (element: Element | null) => {
			setContent?.(element)
			callRef(ref, element)
		}
	}
	return attrs
}

export type PopupView<Trigger extends HTMLElement = HTMLElement, Content extends HTMLElement = HTMLDivElement> = {
	readonly open: boolean
	readonly trigger: Trigger | null
	readonly content: Content | null
	readonly reference: PositionReference | null
	readonly triggerId: string
	readonly contentId: string
	/** Adopts the trigger's rendered id synchronously, or restores the generated id. */
	adoptTriggerId(id?: unknown): string
	/** Composes caller declarations with the live styles owned by popup positioning. */
	contentStyle(style?: unknown): string
	/** Owns the internal arrow probe's stable ref and live positioning style. */
	arrowAttrs(): {
		ref: (element: HTMLElement | null) => void
		style: string
	}
	/** Reads controlled state and current root positioning once per render. */
	sync(open: boolean | null | undefined, position?: PopupPosition): boolean
	setOpen(open: boolean, event?: Event): void
	/** Seeds uncontrolled state without notifying onOpenChange. */
	init(open: boolean): void
	close(event?: Event): void
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
	reference?: (view: View) => PositionReference | null
	source?: (view: View) => HTMLElement | null
	boundary?: (view: View) => Element | null
	/** Optional parent clip used only by reference-hidden detection. */
	referenceBoundary?: (view: View) => Element | null
	referenceHidden?: 'close' | 'hide' | 'none'
	/** Refreshes native source identity when an open reference tuple changes. */
	reopenOnReferenceChange?: boolean
	/** Fires after a current explicit geometry commit and the surface is revealed. */
	onPosition?: (view: View) => void
	dismiss?: {
		prevent?: boolean
		escape?: false | 'host' | 'document'
		outside?: boolean
		inside?: (view: View) => (Element | null | undefined)[]
		onDismiss?: (event: Event, view: View) => void
	}
}

const stacks = new WeakMap<Document, object[]>()
const handled = new WeakSet<Event>()

const declaration = (name: string, value: string, priority = '') =>
	value ? `${name}:${value}${priority ? '!important' : ''}` : ''

const contentOwnedStyle = (element: HTMLElement, arrow: boolean) => [
	declaration('position', element.style.position),
	declaration('left', element.style.left),
	declaration('top', element.style.top),
	declaration('transform-origin', element.style.transformOrigin),
	declaration('box-sizing', element.style.boxSizing),
	declaration('max-width', element.style.maxWidth),
	declaration('max-height', element.style.maxHeight),
	declaration('visibility', element.style.visibility, element.style.getPropertyPriority('visibility')),
	declaration('pointer-events', element.style.pointerEvents, element.style.getPropertyPriority('pointer-events')),
	declaration('--reference-width', element.style.getPropertyValue('--reference-width')),
	declaration('--reference-height', element.style.getPropertyValue('--reference-height')),
	declaration('--available-width', element.style.getPropertyValue('--available-width')),
	declaration('--available-height', element.style.getPropertyValue('--available-height')),
	declaration('--popup-arrow-center', element.style.getPropertyValue('--popup-arrow-center')),
	arrow ? 'overflow:visible' : '',
].filter(Boolean).join(';')

const arrowOwnedStyle = (element: HTMLElement | null) => element ? [
	declaration('left', element.style.left),
	declaration('right', element.style.right),
	declaration('top', element.style.top),
	declaration('bottom', element.style.bottom),
].filter(Boolean).join(';') : ''

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
	let arrow: HTMLElement | null = null
	let content: Content | null = null
	let contentInputStyle: unknown
	let opened = state.value
	let overflowElement: Content | null = null
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
	let positionTask: Promise<boolean> | undefined
	let reopen = false
	let scheduled = false
	const inputStyle = dom(host) ? host.ownerDocument.createElement('span').style : null
	let inputPointerEvents = { priority: '', value: '' }
	let inputVisibility = { priority: '', value: '' }

	const rememberContentStyle = (style: unknown) => {
		contentInputStyle = style
		if (!inputStyle) return
		inputStyle.cssText = typeof style === 'string' ? style : ''
		inputPointerEvents = {
			priority: inputStyle.getPropertyPriority('pointer-events'),
			value: inputStyle.getPropertyValue('pointer-events'),
		}
		inputVisibility = {
			priority: inputStyle.getPropertyPriority('visibility'),
			value: inputStyle.getPropertyValue('visibility'),
		}
	}
	const restore = (target: Content, name: string, input: { priority: string; value: string }) => {
		if (input.value) target.style.setProperty(name, input.value, input.priority)
		else target.style.removeProperty(name)
	}
	const conceal = (target: Content, hidden: boolean) => {
		if (hidden) {
			target.style.setProperty('visibility', 'hidden', 'important')
			target.style.setProperty('pointer-events', 'none', 'important')
		} else {
			restore(target, 'visibility', inputVisibility)
			restore(target, 'pointer-events', inputPointerEvents)
		}
	}

	const reference = () => options.reference?.(view) ?? referenceElement ?? trigger
	const connectedSource = (element: HTMLElement | null | undefined) => element?.isConnected ? element : null
	const source = () => connectedSource(options.source?.(view)) ?? connectedSource(trigger)
	const clearOverflow = () => {
		if (!overflowElement) return
		const target = overflowElement
		overflowElement = null
		if (target === content) {
			target.setAttribute('style', popupStyle(contentInputStyle, contentOwnedStyle(target, false)))
		} else {
			target.style.overflow = ''
		}
	}
	const syncOverflow = () => {
		if (overflowElement && (overflowElement !== content || !arrow)) clearOverflow()
		if (!content || !arrow) return
		overflowElement = content
		content.style.overflow = 'visible'
	}
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

	const closeTarget = (target: Content) => {
		let error: unknown
		try {
			if (!closePopover(target)) error = new Error('Failed to close the native popover')
		} catch (cause) {
			error = cause
		} finally {
			conceal(target, false)
		}
		return error
	}

	const discard = (target: Content) => {
		remove(view, target)
		target.dataset.state = 'closed'
		const error = closeTarget(target)
		if (error !== undefined && !host.signal.aborted) host.throw(error)
	}

	const closeCurrent = (target = content, notify = true) => {
		const wasShown = shown
		if (target) target.dataset.state = 'closed'
		version++
		geometry.stop()
		remove(view, target)
		shown = false
		positionTask = undefined
		referenceIsHidden = false
		if (!target) return
		const error = closeTarget(target)
		if (wasShown && notify) options.onSync?.(false, view)
		if (error !== undefined && !host.signal.aborted) host.throw(error)
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

		try {
			if (!openPopover(target, source())) {
				throw new Error('Failed to open the native popover')
			}
			if (!wasNativeOpen) push(view, target)
			const committed = await geometry.start()
			if (
				!committed ||
				token !== version ||
				!opened ||
				content !== target ||
				!popoverOpen(target)
			) {
				geometry.stop()
				if (reopen && opened && !host.signal.aborted) {
					if (content === target) conceal(target, true)
					else discard(target)
				} else if (opened && content === target && !host.signal.aborted) {
					view.close()
				} else if (content === target) {
					closeCurrent(target)
				} else {
					discard(target)
				}
				return false
			}

			shown = true
			target.dataset.state = 'open'
			reveal(target)
			options.onPosition?.(view)
			if (!wasShown) options.onSync?.(true, view)
			return true
		} catch (error) {
			geometry.stop()
			if (opened && content === target && !host.signal.aborted) view.close()
			else if (content === target) closeCurrent(target)
			else discard(target)
			throw error
		}
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
		const target = content
		const pending = geometry.update()
		if (opening || pending === positionTask) return
		positionTask = pending
		const clear = () => {
			if (positionTask === pending) positionTask = undefined
		}
		void pending.then(committed => {
			clear()
			if (committed && opened && shown && target === content) options.onPosition?.(view)
		}, error => {
			clear()
			report(error)
		})
	}

	const arrowSize = resize(host, {
		target: () => opened ? arrow : null,
		onResize: update,
	})

	const restart = (reopenSource = false) => {
		if (!opened || host.signal.aborted) return
		version++
		geometry.stop()
		positionTask = undefined
		referenceIsHidden = false
		if (reopenSource && content && popoverOpen(content)) {
			const error = closeTarget(content)
			if (error !== undefined) report(error)
		}
		if (content) {
			conceal(content, true)
		}
		schedule()
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
			rememberContentStyle(style)
			return popupStyle(style, content ? contentOwnedStyle(content, Boolean(arrow)) : '')
		},
		arrowAttrs() {
			return {
				ref: setArrow,
				style: arrowOwnedStyle(arrow),
			}
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
		close: (event?: Event) => setOpen(false, event),
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
			if (element?.id && element.id !== triggerId) {
				triggerId = element.id
				queueMicrotask(() => host.next())
			}
			const referenceChanged = reference() !== previousReference
			const sourceChanged = source() !== previousSource
			if (referenceChanged || sourceChanged) restart(sourceChanged)
		},
		setContent(element) {
			if (element === content) return
			const previous = content
			if (previous) closeCurrent(previous, false)
			content = element
			syncOverflow()
			if (element) element.dataset.state = 'closed'
			if (opened) schedule()
		},
		setReference(element) {
			if (element === referenceElement) return
			const previousReference = reference()
			const previousSource = source()
			referenceElement = element
			const referenceChanged = reference() !== previousReference
			const sourceChanged = source() !== previousSource
			if (referenceChanged || sourceChanged) restart(sourceChanged || options.reopenOnReferenceChange)
		},
		update,
	} as View

	function setArrow(element: HTMLElement | null) {
		if (element === arrow) return
		arrow = element
		syncOverflow()
		arrowSize.sync()
		restart()
	}

	if (options.dismiss) dismiss(host, {
		active: () => opened && Boolean(content && popoverOpen(content)) && top(view, content),
		inside: () => options.dismiss?.inside?.(view) ?? [trigger, content],
		prevent: options.dismiss.prevent,
		escape: options.dismiss.escape ?? 'document',
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
		clearOverflow()
	}, { once: true })
	return view
}
