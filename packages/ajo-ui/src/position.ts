import {
	arrow as arrowMiddleware,
	autoPlacement,
	autoUpdate,
	computePosition,
	flip,
	hide,
	inline,
	limitShift,
	offset,
	shift,
	size,
	type Middleware,
	type Placement,
	type ReferenceElement,
} from '@floating-ui/dom'
import type { Host } from 'ajo'
import { dom } from 'ajo-cloves'
import type { PopupPlacement } from './popup'
import { direction } from './shared'

export type PositionProfile =
	| 'popover'
	| 'tooltip'
	| 'menu'
	| 'submenu'
	| 'select'
	| 'date'
	| 'navigation'
	| 'context'
	| 'menubar'

/** Private real-or-virtual reference shape owned at the Adapter boundary. */
export type PositionReference = ReferenceElement

/** Private zero-area virtual reference shared by point-positioned families. */
export const pointReference = (
	contextElement: Element,
	point: () => { x: number; y: number },
): PositionReference => ({
	contextElement,
	getBoundingClientRect: () => {
		const { x, y } = point()
		return { x, y, top: y, right: x, bottom: y, left: x, width: 0, height: 0 }
	},
})

export type PositionElements = {
	reference: PositionReference | null
	floating: HTMLElement | null
	arrow: HTMLElement | null
}

export type PositionOptions = {
	profile: PositionProfile
	elements: () => PositionElements
	placement?: () => PopupPlacement | undefined
	gap?: () => number | undefined
	boundary?: () => Element | null
	/** Optional clipping boundary used only to decide whether the reference is hidden. */
	referenceBoundary?: () => Element | null
	referenceHidden?: (hidden: boolean) => void
}

export type PositionView = {
	/** Starts observation and resolves true after a current first commit. */
	start(): Promise<boolean>
	/** Coalesces a geometry update and resolves true after a current commit. */
	update(): Promise<boolean>
	/** Invalidates pending work and removes the active observation scope. */
	stop(): void
}

type Policy = {
	placement: Placement
	gap: number
	padding: number
	inline?: boolean
	size?: 'both' | 'width'
	hidden?: boolean
	crossAxis?: number
	fallbackAxisSideDirection?: 'end' | 'start'
	fallbackPlacements?: Placement[]
}

const policies: Record<PositionProfile, Policy> = {
	popover: { placement: 'bottom', gap: 4, padding: 8, inline: true, size: 'both', hidden: true },
	tooltip: { placement: 'top', gap: 8, padding: 8, inline: true, size: 'width', hidden: true, fallbackAxisSideDirection: 'start' },
	menu: { placement: 'bottom-start', gap: 4, padding: 4, size: 'both', hidden: true },
	submenu: { placement: 'right-start', gap: 4, padding: 4, size: 'both', hidden: true, fallbackPlacements: ['left-start'] },
	// A field's popup keeps 8 px, on the 4 px grid of its rows and padding, so
	// its edge meets a boundary below it or clears it, never a pixel or two short.
	select: { placement: 'bottom-start', gap: 8, padding: 8, size: 'both', hidden: true },
	date: { placement: 'bottom-start', gap: 8, padding: 8, size: 'both', hidden: true },
	navigation: { placement: 'bottom', gap: 8, padding: 8, size: 'both', hidden: true },
	context: { placement: 'bottom-start', gap: 2, padding: 4, size: 'both', hidden: true },
	menubar: { placement: 'bottom-start', gap: 8, padding: 4, size: 'both', hidden: true, crossAxis: -4 },
}

// A submenu opens toward the inline end, so a right-to-left menu mirrors it.
const rtlSubmenu: Policy = { ...policies.submenu, placement: 'left-start', fallbackPlacements: ['right-start'] }

const policyFor = (profile: PositionProfile, reference: PositionReference) => {
	const element = dom(reference) ? reference : reference.contextElement
	return profile === 'submenu' && element && direction(element) === 'rtl' ? rtlSubmenu : policies[profile]
}

const inactive = (): PositionView => ({
	start: async () => false,
	update: async () => false,
	stop() { },
})

const connected = (reference: PositionReference) => {
	if (dom(reference)) return reference.isConnected
	return !reference.contextElement || reference.contextElement.isConnected
}

const round = (value: number, target: Element) => {
	const ratio = target.ownerDocument.defaultView?.devicePixelRatio || 1
	return Math.round(value * ratio) / ratio
}

const parts = (placement: Placement) => {
	const [side, align = 'center'] = placement.split('-')
	return { side, align }
}

const overflow = (padding: number, boundary: Element | null) => ({
	padding,
	...(boundary ? { boundary } : {}),
})

const middleware = (
	policy: Policy,
	preferred: PopupPlacement,
	gap: number,
	boundary: Element | null,
	referenceBoundary: Element | null,
	arrow: HTMLElement | null,
	applySize: (
		availableHeight: number,
		availableWidth: number,
		floating: HTMLElement,
		referenceHeight: number,
		referenceWidth: number,
	) => void,
): Middleware[] => {
	const detect = overflow(policy.padding, boundary)
	const placement = preferred === 'auto' ? policy.placement : preferred
	const aligned = placement.includes('-')
	const move = shift({ ...detect, limiter: limitShift() })
	const fallback = flip({
		...detect,
		fallbackAxisSideDirection: policy.fallbackAxisSideDirection ?? 'end',
		...(policy.fallbackPlacements ? { fallbackPlacements: policy.fallbackPlacements } : {}),
	})
	const collision = preferred === 'auto'
		? [autoPlacement(detect), move]
		: aligned ? [fallback, move] : [move, fallback]
	const result: Middleware[] = []
	// Floating UI requires inline() before offset() so a multiline rect reset
	// recalculates the requested gap against the selected client rect.
	if (policy.inline) result.push(inline())
	result.push(offset({ mainAxis: gap, crossAxis: policy.crossAxis ?? 0 }))
	result.push(...collision)
	if (policy.size) result.push(size({
		...detect,
		apply({ availableHeight, availableWidth, elements, rects }) {
			applySize(
				availableHeight,
				availableWidth,
				elements.floating,
				rects.reference.height,
				rects.reference.width,
			)
		},
	}))
	if (arrow) result.push(arrowMiddleware({ element: arrow, padding: 8 }))
	if (policy.hidden) {
		result.push(hide(overflow(policy.padding, referenceBoundary ?? boundary)))
		result.push(hide({ ...detect, strategy: 'escaped' }))
	}
	return result
}

const clearArrow = (arrow: HTMLElement | null) => {
	if (!arrow) return
	arrow.style.left = ''
	arrow.style.right = ''
	arrow.style.top = ''
	arrow.style.bottom = ''
	delete arrow.dataset.arrowUncentered
}

const resetFloating = (floating: HTMLElement) => {
	floating.style.position = ''
	floating.style.left = ''
	floating.style.top = ''
	floating.style.transformOrigin = ''
	floating.style.boxSizing = ''
	floating.style.maxWidth = ''
	floating.style.maxHeight = ''
	floating.style.removeProperty('--reference-width')
	floating.style.removeProperty('--reference-height')
	floating.style.removeProperty('--available-width')
	floating.style.removeProperty('--available-height')
	floating.style.removeProperty('--popup-arrow-center')
	delete floating.dataset.placement
	delete floating.dataset.side
	delete floating.dataset.align
	delete floating.dataset.referenceHidden
	delete floating.dataset.escaped
}

const origin = (target: HTMLElement, side: string, align: string) => {
	const horizontal = side === 'top' || side === 'bottom'
	const rtl = horizontal && direction(target) === 'rtl'
	const cross = align === 'center' ? '50%'
		: align === 'start' ? rtl ? '100%' : '0%'
			: rtl ? '0%' : '100%'
	return side === 'top' ? `${cross} 100%`
		: side === 'right' ? `0% ${cross}`
			: side === 'bottom' ? `${cross} 0%`
				: `100% ${cross}`
}

/** Private Floating UI Adapter shared by popup families. */
export const position = (host: Host, options: PositionOptions): PositionView => {
	if (!dom(host) || !host.ownerDocument.defaultView) return inactive()

	let active = false
	let cleanup: (() => void) | undefined
	let current: PositionElements | undefined
	let generation = 0
	let hidden: boolean | undefined
	let pending: Promise<boolean> | undefined
	let requested = 0

	const stopScope = () => {
		const dispose = cleanup
		active = false
		generation++
		cleanup = undefined
		pending = undefined
		try {
			dispose?.()
		} catch (error) {
			host.throw(error)
		}
	}

	const valid = (version: number, elements: PositionElements) =>
		active &&
		version === generation &&
		current?.reference === elements.reference &&
		current.floating === elements.floating &&
		current.arrow === elements.arrow &&
		!host.signal.aborted &&
		Boolean(elements.floating?.isConnected) &&
		Boolean(elements.reference && connected(elements.reference))
	const currentRequest = (scope: number, request: number, elements: PositionElements) =>
		request === requested && valid(scope, elements)

	const commit = (
		elements: PositionElements,
		result: Awaited<ReturnType<typeof computePosition>>,
	) => {
		const target = elements.floating!
		const { side, align } = parts(result.placement)
		const x = round(result.x, target)
		const y = round(result.y, target)

		target.style.position = 'fixed'
		target.style.left = `${x}px`
		target.style.top = `${y}px`

		target.dataset.placement = result.placement
		target.dataset.side = side
		target.dataset.align = align

		const hiddenData = result.middlewareData.hide
		const referenceHidden = Boolean(hiddenData?.referenceHidden)
		const escaped = Boolean(hiddenData?.escaped)
		if (referenceHidden) target.dataset.referenceHidden = 'true'
		else delete target.dataset.referenceHidden
		if (escaped) target.dataset.escaped = 'true'
		else delete target.dataset.escaped
		const notifyHidden = hidden !== referenceHidden
		hidden = referenceHidden

		const arrow = elements.arrow
		const arrowData = result.middlewareData.arrow
		clearArrow(arrow)
		target.style.removeProperty('--popup-arrow-center')
		if (arrow && arrowData) {
			if (arrowData.x != null) arrow.style.left = `${round(arrowData.x, target)}px`
			if (arrowData.y != null) arrow.style.top = `${round(arrowData.y, target)}px`
			const staticSide = side === 'top' ? 'bottom' : side === 'right' ? 'left' : side === 'bottom' ? 'top' : 'right'
			const arrowSize = side === 'top' || side === 'bottom' ? arrow.offsetHeight : arrow.offsetWidth
			arrow.style[staticSide] = `${round(-arrowSize / 2, target)}px`
			if (arrowData.centerOffset !== 0) arrow.dataset.arrowUncentered = 'true'

			const center = side === 'top' || side === 'bottom'
				? `${round((arrowData.x ?? 0) + arrow.offsetWidth / 2, target)}px`
				: `${round((arrowData.y ?? 0) + arrow.offsetHeight / 2, target)}px`
			target.style.setProperty('--popup-arrow-center', center)
			target.style.transformOrigin = side === 'top' ? `${center} bottom`
				: side === 'right' ? `left ${center}`
					: side === 'bottom' ? `${center} top`
						: `right ${center}`
		} else {
			target.style.transformOrigin = origin(target, side, align)
		}

		return notifyHidden ? referenceHidden : undefined
	}

	const calculate = async (scope: number, request: number) => {
		const elements = current
		if (!elements?.reference || !elements.floating) return false
		const policy = policyFor(options.profile, elements.reference)
		const preferred = options.placement?.() ?? policy.placement
		const placement = preferred === 'auto' ? policy.placement : preferred
		try {
			const result = await computePosition(elements.reference, elements.floating, {
				placement,
				strategy: 'fixed',
				middleware: middleware(
					policy,
					preferred,
					options.gap?.() ?? policy.gap,
					options.boundary?.() ?? null,
					options.referenceBoundary?.() ?? null,
					elements.arrow,
					(availableHeight, availableWidth, target, referenceHeight, referenceWidth) => {
						if (!currentRequest(scope, request, elements) || target !== elements.floating) return
						const height = Math.max(0, availableHeight)
						const width = Math.max(0, availableWidth)
						target.style.boxSizing = 'border-box'
						target.style.maxWidth = `${width}px`
						if (policy.size === 'both') target.style.maxHeight = `${height}px`
						target.style.setProperty('--reference-width', `${referenceWidth}px`)
						target.style.setProperty('--reference-height', `${referenceHeight}px`)
						target.style.setProperty('--available-width', `${width}px`)
						target.style.setProperty('--available-height', `${height}px`)
					},
				),
			})
			if (!currentRequest(scope, request, elements)) return false
			const referenceHidden = commit(elements, result)
			if (referenceHidden !== undefined) options.referenceHidden?.(referenceHidden)
			return true
		} catch (error) {
			// A superseded request or scope resolves false instead of failing the current one.
			if (!currentRequest(scope, request, elements)) return false
			throw error
		}
	}

	const drain = async (scope: number) => {
		let committed = false
		while (active && generation === scope) {
			const expected = requested
			committed = await calculate(scope, expected)
			if (expected === requested) break
		}
		return committed
	}

	// One in-flight task per scope: requests made while it runs mark it dirty,
	// and it recalculates until the latest request has been calculated.
	const update = () => {
		if (!active) return Promise.resolve(false)
		requested++
		if (pending) return pending
		const task = drain(generation)
		const clear = () => {
			if (pending === task) pending = undefined
		}
		pending = task
		void task.then(clear, clear)
		return task
	}

	const fail = (error: unknown) => {
		if (host.signal.aborted) return
		queueMicrotask(() => {
			if (!host.signal.aborted) host.throw(error)
		})
	}

	const stop = () => {
		stopScope()
		hidden = undefined
	}

	const start = async () => {
		if (host.signal.aborted) {
			stop()
			return false
		}
		const next = options.elements()
		if (!next.reference || !next.floating || !next.floating.isConnected || !connected(next.reference)) {
			stop()
			return false
		}

		const previous = current
		stopScope()
		if (previous?.arrow !== next.arrow) clearArrow(previous?.arrow ?? null)
		if (previous?.floating && previous.floating !== next.floating) resetFloating(previous.floating)
		current = next
		active = true
		hidden = undefined

		try {
			let starting = true
			cleanup = autoUpdate(next.reference, next.floating, () => {
				if (!starting) void update().catch(fail)
			})
			starting = false
			return await update()
		} catch (error) {
			stop()
			throw error
		}
	}

	host.signal.addEventListener('abort', stop, { once: true })
	return { start, stop, update }
}
