import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { callHandler, callRef, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'
import { contentAttrs, datasetPlacement, floating, triggerAttrs, type FloatingView } from './floating'
import type { FixedArgs, OmitArg } from './utils'

export type TooltipAlign = 'center' | 'end' | 'start'
export type TooltipSide = 'bottom' | 'left' | 'right' | 'top'

export type TooltipProviderArgs = WithChildren<IntrinsicElements['div'] & {
	/** Delay before a tooltip opens, in milliseconds. */
	delayDuration?: number
	/** Delay window after a tooltip closes. */
	skipDelayDuration?: number
	/** Close immediately when pointer leaves the trigger instead of allowing hover over the content. */
	disableHoverableContent?: boolean
	/** Additional CSS classes. */
	class?: string
	/** Inline CSS string. */
	style?: string
}>

export type TooltipArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'onchange'> & {
	/** Controlled open state. */
	open?: boolean
	/** Initial open state for uncontrolled usage. */
	defaultOpen?: boolean
	/** Disable trigger activation. */
	disabled?: boolean
	/** Delay before this tooltip opens, in milliseconds. */
	delayDuration?: number
	/** Close immediately when pointer leaves the trigger instead of allowing hover over the content. */
	disableHoverableContent?: boolean
	/** Called whenever the tooltip opens or closes. */
	onOpenChange?: (open: boolean, event?: Event) => void
	/** Additional CSS classes. */
	class?: string
}> & FixedArgs<'onchange'>

export type TooltipTriggerArgs = WithChildren<(IntrinsicElements['button'] & IntrinsicElements['span']) & {
	/** Render the trigger wrapper as a button or span. */
	as?: 'button' | 'span'
	/** Additional CSS classes. */
	class?: string
}>

export type TooltipContentArgs = WithChildren<IntrinsicElements['div'] & {
	/** Horizontal alignment relative to the trigger. */
	align?: TooltipAlign
	/** Pixel shift along the alignment axis. */
	alignOffset?: number
	/** Preferred side relative to the trigger. */
	side?: TooltipSide
	/** Gap between trigger and content in pixels. */
	sideOffset?: number
	/** Viewport padding used by the fallback placer. */
	collisionPadding?: number
	/** Additional CSS classes. */
	class?: string
	/** Inline CSS string. */
	style?: string
}>

export type TooltipArrowArgs = WithChildren<IntrinsicElements['span'] & {
	/** Additional CSS classes. */
	class?: string
	/** Inline CSS string. */
	style?: string
}>

type ProviderContextValue = {
	delayDuration: number
	disableHoverableContent: boolean
	markClosed: () => void
	shouldSkipDelay: () => boolean
	skipDelayDuration: number
}

type TooltipContextValue = {
	clearArrow: (element: HTMLElement) => void
	close: (event?: Event) => void
	content: HTMLDivElement | null
	contentId: string
	disabled: boolean
	open: boolean
	openWithDelay: (event?: Event) => void
	registerContentHover: (hovering: boolean, event?: Event) => void
	registerFocus: (focused: boolean, event?: Event) => void
	registerTriggerHover: (hovering: boolean, event?: Event) => void
	setArrow: (element: HTMLElement | null) => void
	setContent: (element: HTMLDivElement | null) => void
	setOpen: (open: boolean, event?: Event) => void
	setTrigger: (element: HTMLElement | null) => void
	trigger: HTMLElement | null
	triggerId: string
}

const ProviderContext = context<ProviderContextValue | null>(null)
const TooltipContext = context<TooltipContextValue | null>(null)

const TooltipProviderRoot: Stateful<TooltipProviderArgs> = function* () {
	let lastClosedAt = 0
	let skipDelayDuration = 300

	for (const args of this) {
		skipDelayDuration = Math.max(0, Number(args.skipDelayDuration ?? 300))

		ProviderContext({
			delayDuration: Math.max(0, Number(args.delayDuration ?? 0)),
			disableHoverableContent: Boolean(args.disableHoverableContent),
			markClosed: () => lastClosedAt = Date.now(),
			shouldSkipDelay: () => Date.now() - lastClosedAt <= skipDelayDuration,
			skipDelayDuration,
		})

		yield <>{args.children}</>
	}
}


/** Unstyled shared defaults provider for descendant tooltips. */
const TooltipProvider: Stateless<TooltipProviderArgs> = ({
	children,
	class: classes,
	'data-slot': slot = 'tooltip-provider',
	delayDuration,
	disableHoverableContent,
	skipDelayDuration,
	style,
	...attrs
}) => (
	<TooltipProviderRoot
		{...rootAttrs(attrs)}
		delayDuration={delayDuration}
		disableHoverableContent={disableHoverableContent}
		skipDelayDuration={skipDelayDuration}
		attr:class={classes}
		attr:data-slot={slot}
		attr:style={style}
	>
		{children}
	</TooltipProviderRoot>
)

const TooltipRoot: Stateful<TooltipArgs> = function* ({ defaultOpen, open }) {
	let delayDuration = 0
	let disabled = false
	let disableHoverableContent = false
	let onOpenChange: TooltipArgs['onOpenChange']
	let provider: ProviderContextValue | null = null
	let tip: FloatingView<HTMLElement, HTMLDivElement>

	tip = floating<HTMLElement, HTMLDivElement>(this, {
		prefix: 'tooltip',
		initialOpen: Boolean(open ?? defaultOpen),
		disabled: () => disabled,
		hover: {
			openDelay: () => delayDuration <= 0 || provider?.shouldSkipDelay() ? 0 : delayDuration,
			closeDelay: () => 80,
		},
		onOpenChange: (next, event) => onOpenChange?.(next, event),
		onSetOpen: next => {
			if (!next) provider?.markClosed()
		},
		placement: datasetPlacement(() => tip.content, {
			side: 'top',
			align: 'center',
			sideOffset: 0,
			padding: 8,
			constrain: 'height',
		}),
		dismiss: {
			prevent: true,
			onDismiss: (event, view) => {
				view.cancelHover()
				view.setOpen(false, event)
			},
		},
	})

	const openWithDelay = (event?: Event) => tip.hold('trigger', event as Event)

	const close = (event?: Event) => {
		tip.cancelHover()
		tip.close(event)
	}

	const registerContentHover = (hovering: boolean, event?: Event) => {
		if (disableHoverableContent) return
		if (hovering) tip.hold('content', event as Event)
		else tip.release('content', event as Event)
	}

	const registerTriggerHover = (hovering: boolean, event?: Event) => {
		if (hovering) openWithDelay(event)
		else if (disableHoverableContent) {
			tip.release('trigger', event as Event)
			tip.cancelHover()
			tip.setOpen(false, event)
		} else {
			tip.release('trigger', event as Event)
		}
	}

	const registerFocus = (next: boolean, event?: Event) => {
		if (next) tip.hold('focus', event as Event)
		else tip.release('focus', event as Event)
	}

	for (const args of this) {
		provider = ProviderContext()
		delayDuration = Math.max(0, Number(args.delayDuration ?? provider?.delayDuration ?? 0))
		disabled = Boolean(args.disabled)
		disableHoverableContent = Boolean(args.disableHoverableContent ?? provider?.disableHoverableContent)
		onOpenChange = args.onOpenChange
		const opened = tip.sync(args.open == null ? null : Boolean(args.open))

		TooltipContext({
			...tip,
			close,
			disabled,
			open: opened,
			openWithDelay,
			registerContentHover,
			registerFocus,
			registerTriggerHover,
		})

		yield <>{args.children}</>
	}
}


/** Unstyled root provider for one tooltip. */
const Tooltip: Stateless<TooltipArgs> = ({
	children,
	class: classes,
	'data-slot': slot = 'tooltip',
	defaultOpen,
	delayDuration,
	disabled,
	disableHoverableContent,
	onOpenChange,
	open,
	...attrs
}) => (
	<TooltipRoot
		{...rootAttrs(attrs)}
		defaultOpen={defaultOpen}
		delayDuration={delayDuration}
		disabled={disabled}
		disableHoverableContent={disableHoverableContent}
		onOpenChange={onOpenChange}
		open={open}
		attr:class={classes}
		attr:data-slot={slot}
	>
		{children}
	</TooltipRoot>
)

/** Unstyled element that owns the tooltip description. */
const TooltipTrigger: Stateless<TooltipTriggerArgs> = ({
	as = 'button',
	children,
	class: classes,
	'data-slot': slot = 'tooltip-trigger',
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
}) => {
	const tooltip = TooltipContext()
	const disabledFlag = Boolean(disabled ?? tooltip?.disabled)

	const common = {
		...attrs,
		...triggerAttrs({
			describedby: tooltip?.contentId,
			id,
			open: Boolean(tooltip?.open),
			ref,
			setTrigger: tooltip?.setTrigger,
			triggerId: tooltip?.triggerId,
		}),
		class: classes,
		'data-slot': slot,
		'data-tooltip-trigger': 'true',
		'set:onblur': (event: FocusEvent) => {
			callHandler(onBlur, event)
			tooltip?.registerFocus(false, event)
		},
		'set:onfocus': (event: FocusEvent) => {
			callHandler(onFocus, event)
			if (event.defaultPrevented || disabledFlag) return
			tooltip?.registerFocus(true, event)
		},
		'set:onkeydown': (event: KeyboardEvent) => {
			callHandler(onKeydown, event)
		},
		'set:onmouseleave': (event: MouseEvent) => {
			callHandler(onMouseLeave, event)
			tooltip?.registerTriggerHover(false, event)
		},
		'set:onmouseenter': (event: MouseEvent) => {
			callHandler(onMouseEnter, event)
			if (event.defaultPrevented || disabledFlag) return
			tooltip?.registerTriggerHover(true, event)
		},
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

/** Unstyled non-interactive text bubble shown for a TooltipTrigger. */
const TooltipContent: Stateless<TooltipContentArgs> = ({
	align = 'center',
	alignOffset = 0,
	children,
	class: classes,
	collisionPadding = 8,
	'data-slot': slot = 'tooltip-content',
	id: idArg,
	ref,
	role = 'tooltip',
	side = 'top',
	sideOffset = 8,
	style,
	'set:onmouseleave': onMouseLeave,
	'set:onmouseenter': onMouseEnter,
	...attrs
}) => {
	const tooltip = TooltipContext()

	return (
		<div
			{...attrs}
			{...contentAttrs({
				align,
				alignOffset,
				collisionPadding,
				id: idArg ?? tooltip?.contentId,
				open: Boolean(tooltip?.open),
				popover: 'manual',
				ref,
				setContent: tooltip?.setContent,
				side,
				sideOffset,
				style,
			})}
			class={classes}
			data-slot={slot}
			data-tooltip-content="true"
			role={role}
			set:onmouseleave={(event: MouseEvent) => {
				callHandler(onMouseLeave, event)
				tooltip?.registerContentHover(false, event)
			}}
			set:onmouseenter={(event: MouseEvent) => {
				callHandler(onMouseEnter, event)
				tooltip?.registerContentHover(true, event)
			}}
		>
			{children}
		</div>
	)
}

/**
 * Unstyled caret marker rendered inside TooltipContent. The placer pins it to
 * the content edge nearest the trigger, centered on the trigger and clamped to
 * the content bounds (data-uncentered flags a clamped position); the content's
 * data-side drives any themed rotation. While an arrow is registered the
 * content's overflow is forced visible so the caret can straddle the edge, so
 * tall scrollable content needs an inner scroll container.
 */
const TooltipArrow: Stateless<TooltipArrowArgs> = ({
	children,
	class: classes,
	'data-slot': slot = 'tooltip-arrow',
	ref,
	style,
	...attrs
}) => {
	const tooltip = TooltipContext()
	let mounted: HTMLSpanElement | null = null

	const reference = (element: HTMLSpanElement | null) => {
		if (element) tooltip?.setArrow(mounted = element)
		else if (mounted) tooltip?.clearArrow(mounted)
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

export {
	Tooltip,
	TooltipArrow,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
}
