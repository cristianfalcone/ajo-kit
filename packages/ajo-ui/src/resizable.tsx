import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { clamp, listen, move, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'
import { stlx } from './utils'

export type ResizableOrientation = 'horizontal' | 'vertical'
export type ResizableSize = number | string

export type ResizablePanelGroupArgs = WithChildren<IntrinsicElements['div'] & {
	/** Resize direction for adjacent panels. */
	orientation?: ResizableOrientation
}>

export type ResizablePanelArgs = WithChildren<IntrinsicElements['div'] & {
	/** Initial panel size as a percentage number or string such as `50%`. */
	defaultSize?: ResizableSize
	/** Minimum panel size as a percentage. */
	minSize?: ResizableSize
	/** Maximum panel size as a percentage. */
	maxSize?: ResizableSize
}>

export type ResizableHandleArgs = WithChildren<IntrinsicElements['div'] & {
	/** Disable pointer and keyboard resizing for this handle. */
	disabled?: boolean
}>

type ResizableContextValue = {
	orientation: ResizableOrientation
}

type ResizeSession = {
	groupSize: number
	handle: HTMLElement
	next: HTMLElement
	nextMax: number
	nextMin: number
	prev: HTMLElement
	prevMax: number
	prevMin: number
	prevStart: number
	total: number
}

const ResizableContext = context<ResizableContextValue>({ orientation: 'horizontal' })

const percent = (size: ResizableSize | undefined, fallback: number) => {
	if (typeof size === 'number' && Number.isFinite(size)) return size
	if (typeof size === 'string') {
		const parsed = Number.parseFloat(size)
		if (Number.isFinite(parsed)) return parsed
	}
	return fallback
}

const limit = (panel: HTMLElement, name: 'maxSize' | 'minSize', fallback: number) =>
	percent(panel.dataset[name], fallback)

const style = (
	orientation: ResizableOrientation,
	defaultSize: ResizableSize | undefined,
	minSize: ResizableSize | undefined,
	maxSize: ResizableSize | undefined,
	styles: unknown,
) => {
	const basis = percent(defaultSize, 0)

	return stlx(
		typeof styles === 'string' ? styles : undefined,
		{ flex: defaultSize == null ? '1 1 0' : `0 0 ${basis}%` },
		minSize == null ? undefined : {
			[orientation === 'horizontal' ? 'minWidth' : 'minHeight']: `${percent(minSize, 0)}%`,
		},
		maxSize == null ? undefined : {
			[orientation === 'horizontal' ? 'maxWidth' : 'maxHeight']: `${percent(maxSize, 100)}%`,
		},
	)
}

const mainSize = (element: HTMLElement, orientation: ResizableOrientation) => {
	const box = element.getBoundingClientRect()
	return orientation === 'horizontal' ? box.width : box.height
}

const previousPanel = (handle: HTMLElement) => {
	let node = handle.previousElementSibling
	while (node && !(node instanceof HTMLElement && node.matches('[data-slot="resizable-panel"]'))) {
		node = node.previousElementSibling
	}
	return node instanceof HTMLElement ? node : null
}

const nextPanel = (handle: HTMLElement) => {
	let node = handle.nextElementSibling
	while (node && !(node instanceof HTMLElement && node.matches('[data-slot="resizable-panel"]'))) {
		node = node.nextElementSibling
	}
	return node instanceof HTMLElement ? node : null
}

const owningGroup = (handle: HTMLElement) =>
	handle.closest<HTMLElement>('[data-slot="resizable-panel-group"]')

const setPanelSize = (panel: HTMLElement, px: number, groupSize: number) => {
	const pct = groupSize > 0 ? px / groupSize * 100 : 0
	panel.dataset.size = String(pct)
	panel.style.flex = `0 0 ${px}px`
	panel.dispatchEvent(new CustomEvent('resize', { detail: { size: pct } }))
}

const setHandleValue = (session: ResizeSession, prev: number) => {
	const pct = session.groupSize > 0 ? prev / session.groupSize * 100 : 0
	session.handle.setAttribute('aria-valuenow', String(Math.round(clamp(pct, 0, 100))))
}

const applyResize = (session: ResizeSession, delta: number) => {
	// Conflicting panel constraints can invert the bounds; the lower bound wins.
	const min = Math.max(session.prevMin, session.total - session.nextMax)
	const max = Math.min(session.prevMax, session.total - session.nextMin)
	const prev = clamp(session.prevStart + delta, min, Math.max(min, max))
	const next = session.total - prev

	setPanelSize(session.prev, prev, session.groupSize)
	setPanelSize(session.next, next, session.groupSize)
	setHandleValue(session, prev)
}

const session = (
	group: HTMLElement,
	handle: HTMLElement,
	orientation: ResizableOrientation,
): ResizeSession | null => {
	const prev = previousPanel(handle)
	const next = nextPanel(handle)
	const groupSize = mainSize(group, orientation)
	if (!prev || !next || groupSize <= 0) return null

	const prevStart = mainSize(prev, orientation)
	const nextStart = mainSize(next, orientation)
	const total = prevStart + nextStart

	const active = {
		groupSize,
		handle,
		next,
		nextMax: groupSize * limit(next, 'maxSize', 100) / 100,
		nextMin: groupSize * limit(next, 'minSize', 0) / 100,
		prev,
		prevMax: groupSize * limit(prev, 'maxSize', 100) / 100,
		prevMin: groupSize * limit(prev, 'minSize', 0) / 100,
		prevStart,
		total,
	}
	setHandleValue(active, prevStart)
	return active
}

const ResizablePanelGroupRoot: Stateful<ResizablePanelGroupArgs> = function* () {
	let orientation: ResizableOrientation = 'horizontal'
	let active: ResizeSession | null = null
	let cursor = ''
	let select = ''

	const restore = () => {
		if (!active) return
		document.body.style.cursor = cursor
		document.body.style.userSelect = select
		active = null
	}
	this.signal.addEventListener('abort', restore, { once: true })

	const drag = move(this, {
		onMove: data => {
			if (active) applyResize(active, orientation === 'horizontal' ? data.dx : data.dy)
		},
		onEnd: () => restore(),
	})

	const startPointer = (event: PointerEvent) => {
		if (active || event.button !== 0) return

		const handle = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-slot="resizable-handle"]')
		if (!handle || owningGroup(handle) !== this || handle.getAttribute('aria-disabled') === 'true') return

		const next = session(this, handle, orientation)
		if (!next) return

		event.preventDefault()
		event.stopPropagation()

		cursor = document.body.style.cursor
		select = document.body.style.userSelect
		document.body.style.cursor = orientation === 'horizontal' ? 'col-resize' : 'row-resize'
		document.body.style.userSelect = 'none'

		active = next
		if (!drag.start(event)) restore()
	}

	const keyResize = (event: KeyboardEvent) => {
		const handle = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-slot="resizable-handle"]')
		if (!handle || owningGroup(handle) !== this || handle.getAttribute('aria-disabled') === 'true') return

		const step = event.shiftKey ? 50 : 10
		const delta = orientation === 'horizontal'
			? event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0
			: event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0

		if (!delta) return

		const active = session(this, handle, orientation)
		if (!active) return

		event.preventDefault()
		applyResize(active, delta)
	}

	listen(this, 'pointerdown', startPointer)
	listen(this, 'keydown', keyResize)

	for (const args of this) {
		orientation = args.orientation ?? 'horizontal'
		ResizableContext({ orientation })
		yield <>{args.children}</>
	}
}


/** Return the current unstyled resizable context. */
const useResizable = () => ResizableContext()

/** Unstyled resizable panel group for split layouts. */
const ResizablePanelGroup: Stateless<ResizablePanelGroupArgs> = ({
	children,
	orientation = 'horizontal',
	...attrs
}) => (
	<ResizablePanelGroupRoot
		{...rootAttrs(attrs)}
		orientation={orientation}
		attr:aria-orientation={orientation}
		attr:data-orientation={orientation}
		attr:data-panel-group-direction={orientation}
		attr:data-slot="resizable-panel-group"
	>
		{children}
	</ResizablePanelGroupRoot>
)

/** Unstyled resizable flex panel. */
const ResizablePanel: Stateless<ResizablePanelArgs> = ({
	children,
	defaultSize,
	maxSize,
	minSize,
	style: styles,
	...attrs
}) => {
	const { orientation } = ResizableContext()
	const initial = percent(defaultSize, 0)

	return (
		<div
			{...attrs}
			data-max-size={maxSize == null ? undefined : percent(maxSize, 100)}
			data-min-size={minSize == null ? undefined : percent(minSize, 0)}
			data-size={defaultSize == null ? undefined : initial}
			data-slot="resizable-panel"
			style={style(orientation, defaultSize, minSize, maxSize, styles)}
		>
			{children}
		</div>
	)
}

/** Unstyled resize separator between adjacent panels. */
const ResizableHandle: Stateless<ResizableHandleArgs> = ({
	children,
	disabled,
	...attrs
}) => {
	const { orientation } = ResizableContext()
	const separator = orientation === 'vertical' ? 'horizontal' : 'vertical'

	return (
		<div
			{...attrs}
			aria-disabled={disabled ? 'true' : undefined}
			aria-orientation={separator}
			aria-valuemax="100"
			aria-valuemin="0"
			data-orientation={separator}
			data-panel-group-direction={orientation}
			data-slot="resizable-handle"
			role="separator"
			tabindex={disabled ? -1 : 0}
		>
			{children}
		</div>
	)
}

export {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
	useResizable,
}
