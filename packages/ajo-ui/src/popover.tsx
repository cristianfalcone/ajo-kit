import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import type { Host } from 'ajo-cloves'
import { callHandler, callRef, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'
import { contentAttrs, datasetPlacement, floating, triggerAttrs, type FloatingView } from './floating'
import type { FixedArgs, OmitArg } from './utils'

/** Alignment of popover content along its placement side. */
export type PopoverAlign = 'center' | 'end' | 'start'
/** Interaction that opens a popover. */
export type PopoverOpenOn = 'click' | 'hover'
/** Preferred side on which popover content is placed. */
export type PopoverSide = 'bottom' | 'left' | 'right' | 'top'

/** Props for the popover root and its controlled open state. */
export type PopoverArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'onchange'> & {
	/** Controlled open state. */
	open?: boolean
	/** Initial open state for uncontrolled usage. */
	defaultOpen?: boolean
	/** Interaction mode that opens the popover. Fixed at mount. Defaults to click. */
	openOn?: PopoverOpenOn
	/** Hover-mode-only delay before opening, in milliseconds. */
	openDelay?: number
	/** Hover-mode-only delay before closing, in milliseconds. */
	closeDelay?: number
	/** Disable trigger activation. */
	disabled?: boolean
	/** Called whenever the popover opens or closes. */
	onOpenChange?: (open: boolean, event?: Event) => void
	/** Additional CSS classes. */
	class?: string
}> & FixedArgs<'onchange'>

type PopoverTriggerSharedArgs = {
	/** Render the trigger wrapper as an anchor, button, or span. */
	as?: 'a' | 'button' | 'span'
	/** Additional CSS classes. */
	class?: string
}

/** Props for the element that opens a popover. */
export type PopoverTriggerArgs = WithChildren<
	| (IntrinsicElements['button'] & PopoverTriggerSharedArgs & { as?: 'button' })
	| (IntrinsicElements['a'] & PopoverTriggerSharedArgs & { as: 'a' })
	| (IntrinsicElements['span'] & PopoverTriggerSharedArgs & { as: 'span' })
>

type PopoverTriggerAllArgs = WithChildren<(IntrinsicElements['a'] & IntrinsicElements['button'] & IntrinsicElements['span']) & PopoverTriggerSharedArgs>

/** Props for the positioned popover panel. */
export type PopoverContentArgs = WithChildren<IntrinsicElements['div'] & {
	/** Horizontal alignment relative to the trigger or anchor. */
	align?: PopoverAlign
	/** Pixel shift along the alignment axis. */
	alignOffset?: number
	/** Preferred side relative to the trigger or anchor. */
	side?: PopoverSide
	/** Gap between anchor and content in pixels. */
	sideOffset?: number
	/** Viewport padding used by the fallback placer. */
	collisionPadding?: number
	/** Additional CSS classes. */
	class?: string
	/** Inline CSS string. */
	style?: string
}>

/** Props for an explicit positioning anchor. */
export type PopoverAnchorArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional CSS classes. */
	class?: string
}>

/** Props for the visual arrow pointing at the popover anchor. */
export type PopoverArrowArgs = WithChildren<IntrinsicElements['span'] & {
	/** Additional CSS classes. */
	class?: string
	/** Inline CSS string. */
	style?: string
}>

/** Props for the layout wrapper around popover heading content. */
export type PopoverHeaderArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional CSS classes. */
	class?: string
}>

/** Props for the heading that labels popover content. */
export type PopoverTitleArgs = WithChildren<IntrinsicElements['h2'] & {
	/** Additional CSS classes. */
	class?: string
}>

/** Props for descriptive text associated with popover content. */
export type PopoverDescriptionArgs = WithChildren<IntrinsicElements['p'] & {
	/** Additional CSS classes. */
	class?: string
}>

type PopoverContextValue = {
	anchor: HTMLElement | null
	clearArrow: (element: HTMLElement) => void
	close: (event?: Event) => void
	content: HTMLDivElement | null
	contentId: string
	descriptionId: string
	disabled: boolean
	open: boolean
	openOn: PopoverOpenOn
	openWithDelay?: (event?: Event) => void
	registerContentFocus?: (focused: boolean, event?: Event) => void
	registerContentHover?: (hovering: boolean, event?: Event) => void
	registerTriggerFocus?: (focused: boolean, event?: Event) => void
	registerTriggerHover?: (hovering: boolean, event?: Event) => void
	setAnchor: (element: HTMLElement | null) => void
	setArrow: (element: HTMLElement | null) => void
	setContent: (element: HTMLDivElement | null) => void
	setOpen: (open: boolean, event?: Event) => void
	setTrigger: (element: HTMLElement | null) => void
	titleId: string
	trigger: HTMLElement | null
	triggerId: string
}

const PopoverContext = context<PopoverContextValue | null>(null)

/** Shared root body for both interaction modes; the mode is fixed per host. */
function* popoverEngine(
	this: Host<HTMLDivElement, PopoverArgs>,
	initial: PopoverArgs,
	mode: PopoverOpenOn,
) {
	let closeDelay = 300
	let disabled = false
	let onOpenChange: PopoverArgs['onOpenChange']
	let openDelay = 700
	let popover: FloatingView<HTMLElement, HTMLDivElement>

	popover = floating<HTMLElement, HTMLDivElement>(this, {
		prefix: 'popover',
		initialOpen: Boolean(initial.open ?? initial.defaultOpen),
		disabled: () => disabled,
		hover: mode === 'hover' ? {
			openDelay: () => openDelay,
			closeDelay: () => closeDelay,
		} : undefined,
		onOpenChange: (next, event) => onOpenChange?.(next, event),
		reference: view => view.anchor ?? view.trigger,
		placement: datasetPlacement(() => popover.content, {
			side: 'bottom',
			align: 'center',
			sideOffset: 4,
			padding: 8,
			constrain: 'height',
		}),
		dismiss: {
			prevent: mode === 'hover',
			onDismiss: (event, view) => {
				view.cancelHover()
				view.setOpen(false, event)
				if (mode === 'click') queueMicrotask(() => view.trigger?.focus())
			},
		},
	})

	const close = (event?: Event) => {
		popover.cancelHover()
		popover.close(event)
	}

	const openWithDelay = (event?: Event) => popover.hold('trigger', event as Event)

	const registerTriggerHover = (hovering: boolean, event?: Event) =>
		hovering ? popover.hold('trigger', event as Event) : popover.release('trigger', event as Event)

	const registerContentHover = (hovering: boolean, event?: Event) =>
		hovering ? popover.hold('content', event as Event) : popover.release('content', event as Event)

	const registerTriggerFocus = (focused: boolean, event?: Event) =>
		focused ? popover.hold('focus-trigger', event as Event) : popover.release('focus-trigger', event as Event)

	const registerContentFocus = (focused: boolean, event?: Event) =>
		focused ? popover.hold('focus-content', event as Event) : popover.release('focus-content', event as Event)

	for (const args of this) {
		closeDelay = Math.max(0, Number(args.closeDelay ?? 300))
		disabled = Boolean(args.disabled)
		onOpenChange = args.onOpenChange
		openDelay = Math.max(0, Number(args.openDelay ?? 700))
		const opened = popover.sync(args.open == null ? null : Boolean(args.open))
		const rootId = popover.contentId.slice(0, -'-content'.length)

		PopoverContext({
			...popover,
			close: mode === 'hover' ? close : popover.close,
			descriptionId: `${rootId}-description`,
			disabled,
			open: opened,
			openOn: mode,
			...(mode === 'hover' ? {
				openWithDelay,
				registerContentFocus,
				registerContentHover,
				registerTriggerFocus,
				registerTriggerHover,
			} : {}),
			titleId: `${rootId}-title`,
		})

		yield <>{args.children}</>
	}
}

const PopoverClickRoot: Stateful<PopoverArgs> = function* (args) {
	yield* popoverEngine.call(this, args, 'click')
}


const PopoverHoverRoot: Stateful<PopoverArgs> = function* (args) {
	yield* popoverEngine.call(this, args, 'hover')
}


/** Unstyled root provider for a popover. */
const Popover: Stateless<PopoverArgs> = ({
	children,
	class: classes,
	'data-slot': slot = 'popover',
	closeDelay,
	defaultOpen,
	disabled,
	onOpenChange,
	open,
	openDelay,
	openOn = 'click',
	...attrs
}) => openOn === 'hover' ? (
	<PopoverHoverRoot
		{...rootAttrs(attrs)}
		closeDelay={closeDelay}
		defaultOpen={defaultOpen}
		disabled={disabled}
		onOpenChange={onOpenChange}
		open={open}
		openDelay={openDelay}
		attr:class={classes}
		attr:data-slot={slot}
	>
		{children}
	</PopoverHoverRoot>
) : (
	<PopoverClickRoot
		{...rootAttrs(attrs)}
		defaultOpen={defaultOpen}
		disabled={disabled}
		onOpenChange={onOpenChange}
		open={open}
		attr:class={classes}
		attr:data-slot={slot}
	>
		{children}
	</PopoverClickRoot>
)

/** Unstyled button that opens a Popover. */
const PopoverTrigger: Stateless<PopoverTriggerArgs> = args => {
	const popover = PopoverContext()
	const all = args as PopoverTriggerAllArgs

	if (popover?.openOn === 'hover') {
		const {
			as = 'button',
			children,
			class: classes,
			'data-slot': slot = 'popover-trigger',
			disabled,
			id,
			ref,
			type = 'button',
			'set:onblur': onBlur,
			'set:onfocus': onFocus,
			'set:onkeydown': onKeydown,
			'set:onmouseleave': onMouseLeave,
			'set:onmouseenter': onMouseEnter,
			...attrs
		} = all
		const disabledFlag = Boolean(disabled ?? popover.disabled)

		const common = {
			...attrs,
			...triggerAttrs({
				controls: popover.contentId,
				id,
				open: popover.open,
				ref,
				setTrigger: popover.setTrigger,
				triggerId: popover.triggerId,
			}),
			class: classes,
			'data-popover-trigger': 'true',
			'data-slot': slot,
			'set:onblur': (event: FocusEvent) => {
				callHandler(onBlur, event)
				popover.registerTriggerFocus?.(false, event)
			},
			'set:onfocus': (event: FocusEvent) => {
				callHandler(onFocus, event)
				if (event.defaultPrevented || disabledFlag) return
				popover.registerTriggerFocus?.(true, event)
			},
			'set:onkeydown': (event: KeyboardEvent) => {
				callHandler(onKeydown, event)
			},
			'set:onmouseleave': (event: MouseEvent) => {
				callHandler(onMouseLeave, event)
				popover.registerTriggerHover?.(false, event)
			},
			'set:onmouseenter': (event: MouseEvent) => {
				callHandler(onMouseEnter, event)
				if (event.defaultPrevented || disabledFlag) return
				popover.registerTriggerHover?.(true, event)
			},
		}

		if (as === 'a') {
			const anchor = attrs as IntrinsicElements['a']

			return (
				<a
					{...common}
					aria-disabled={disabledFlag ? 'true' : undefined}
					href={disabledFlag ? undefined : anchor.href}
					tabIndex={disabledFlag ? -1 : anchor.tabIndex}
				>
					{children}
				</a>
			)
		}

		if (as === 'span') {
			return (
				<span
					{...common}
					aria-disabled={disabledFlag ? 'true' : undefined}
				>
					{children}
				</span>
			)
		}

		return (
			<button
				{...common}
				disabled={disabledFlag}
				type={type}
			>
				{children}
			</button>
		)
	}

	const {
		children,
		'data-slot': slot = 'popover-trigger',
		disabled,
		id,
		ref,
		type = 'button',
		'set:onclick': onClick,
		...attrs
	} = all
	const disabledFlag = Boolean(disabled ?? popover?.disabled)

	return (
		<button
			{...attrs}
			{...triggerAttrs({
				controls: popover?.contentId,
				expanded: Boolean(popover?.open),
				id,
				open: Boolean(popover?.open),
				ref,
				setTrigger: popover?.setTrigger,
				triggerId: popover?.triggerId,
			})}
			data-popover-trigger="true"
			data-slot={slot}
			disabled={disabledFlag}
			set:onclick={(event: Event) => {
				callHandler(onClick, event)
				if (event.defaultPrevented) return
				popover?.setOpen(!popover.open, event)
			}}
			type={type}
		>
			{children}
		</button>
	)
}

/** Optional explicit anchor used to position PopoverContent independently of the trigger. */
const PopoverAnchor: Stateless<PopoverAnchorArgs> = ({
	children,
	class: classes,
	'data-slot': slot = 'popover-anchor',
	ref,
	...attrs
}) => {
	const popover = PopoverContext()
	const reference = (element: HTMLDivElement | null) => {
		popover?.setAnchor(element)
		callRef(ref, element)
	}

	return (
		<div
			{...attrs}
			class={classes}
			data-slot={slot}
			ref={reference}
		>
			{children}
		</div>
	)
}

/**
 * Unstyled caret marker rendered inside PopoverContent. The placer pins it to
 * the content edge nearest the anchor, centered on the anchor and clamped to
 * the content bounds (data-uncentered flags a clamped position); the content's
 * data-side drives any themed rotation. While an arrow is registered the
 * content's overflow is forced visible so the caret can straddle the edge, so
 * tall scrollable content needs an inner scroll container.
 */
const PopoverArrow: Stateless<PopoverArrowArgs> = ({
	children,
	class: classes,
	'data-slot': slot = 'popover-arrow',
	ref,
	style,
	...attrs
}) => {
	const popover = PopoverContext()
	let mounted: HTMLSpanElement | null = null

	const reference = (element: HTMLSpanElement | null) => {
		if (element) popover?.setArrow(mounted = element)
		else if (mounted) popover?.clearArrow(mounted)
		callRef(ref, element)
	}

	return (
		<span
			{...attrs}
			aria-hidden="true"
			class={classes}
			data-slot={slot}
			ref={reference}
			style={style ? `position:absolute;${style}` : 'position:absolute'}
		>
			{children}
		</span>
	)
}

/** Unstyled floating panel for a Popover. */
const PopoverContent: Stateless<PopoverContentArgs> = args => {
	const popover = PopoverContext()

	if (popover?.openOn === 'hover') {
		const {
			align = 'center',
			alignOffset = 0,
			children,
			class: classes,
			collisionPadding = 8,
			'data-slot': slot = 'popover-content',
			id: idArg,
			popover: mode = 'manual',
			ref,
			side = 'bottom',
			sideOffset = 4,
			style,
			'set:onfocusin': onFocusIn,
			'set:onfocusout': onFocusOut,
			'set:onmouseleave': onMouseLeave,
			'set:onmouseenter': onMouseEnter,
			...attrs
		} = args

		return (
			<div
				{...attrs}
				{...contentAttrs({
					align,
					alignOffset,
					collisionPadding,
					id: idArg ?? popover.contentId,
					open: popover.open,
					popover: mode,
					ref,
					setContent: popover.setContent,
					side,
					sideOffset,
					style,
					tabindex: '-1',
				})}
				class={classes}
				data-popover-content="true"
				data-slot={slot}
				set:onfocusout={(event: FocusEvent) => {
					callHandler(onFocusOut, event)
					const next = event.relatedTarget as Node | null
					if (next && popover.content?.contains(next)) return
					popover.registerContentFocus?.(false, event)
				}}
				set:onfocusin={(event: FocusEvent) => {
					callHandler(onFocusIn, event)
					popover.registerContentFocus?.(true, event)
				}}
				set:onmouseleave={(event: MouseEvent) => {
					callHandler(onMouseLeave, event)
					popover.registerContentHover?.(false, event)
				}}
				set:onmouseenter={(event: MouseEvent) => {
					callHandler(onMouseEnter, event)
					popover.registerContentHover?.(true, event)
				}}
			>
				{children}
			</div>
		)
	}

	const {
		align = 'center',
		alignOffset = 0,
		children,
		class: classes,
		collisionPadding = 8,
		'data-slot': slot = 'popover-content',
		id: idArg,
		popover: mode = 'auto',
		ref,
		role = 'dialog',
		side = 'bottom',
		sideOffset = 4,
		style,
		...attrs
	} = args

	return (
		<div
			{...attrs}
			{...contentAttrs({
				align,
				alignOffset,
				collisionPadding,
				id: idArg ?? popover?.contentId,
				open: Boolean(popover?.open),
				popover: mode,
				ref,
				setContent: popover?.setContent,
				side,
				sideOffset,
				style,
				tabindex: '-1',
			})}
			aria-describedby={popover?.descriptionId}
			aria-labelledby={popover?.titleId}
			class={classes}
			data-popover-content="true"
			data-slot={slot}
			role={role}
		>
			{children}
		</div>
	)
}

/** Unstyled header group for PopoverTitle and PopoverDescription. */
const PopoverHeader: Stateless<PopoverHeaderArgs> = ({
	children,
	'data-slot': slot = 'popover-header',
	...attrs
}) => (
	<div
		{...attrs}
		data-slot={slot}
	>
		{children}
	</div>
)

/** Accessible title for PopoverContent. */
const PopoverTitle: Stateless<PopoverTitleArgs> = ({
	children,
	'data-slot': slot = 'popover-title',
	id,
	...attrs
}) => {
	const popover = PopoverContext()

	return (
		<h2
			{...attrs}
			data-slot={slot}
			id={id ?? popover?.titleId}
		>
			{children}
		</h2>
	)
}

/** Supporting copy for PopoverContent. */
const PopoverDescription: Stateless<PopoverDescriptionArgs> = ({
	children,
	'data-slot': slot = 'popover-description',
	id,
	...attrs
}) => {
	const popover = PopoverContext()

	return (
		<p
			{...attrs}
			data-slot={slot}
			id={id ?? popover?.descriptionId}
		>
			{children}
		</p>
	)
}

export {
	Popover,
	PopoverAnchor,
	PopoverArrow,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
}
