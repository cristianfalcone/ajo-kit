import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { callHandler, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'
import { contentAttrs, popup, type PopupView } from './popup'
import { PopupSurface } from './popup-surface'
import type { ReservedPositionArg } from './position'
import { popupStyle, triggerAttrs, type FixedArgs, type OmitArg, type PopupPosition } from './utils'
export type { PopupPlacement, PopupPosition } from './utils'

/** Props for shared timing and hover defaults inherited by tooltips. */
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

/** Props for the tooltip root and its controlled open state. */
export type TooltipArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'onchange' | ReservedPositionArg> & PopupPosition & {
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
}> & FixedArgs<'onchange' | ReservedPositionArg>

/** Props for the button or span that opens a tooltip. */
export type TooltipTriggerArgs = WithChildren<(IntrinsicElements['button'] & IntrinsicElements['span']) & {
	/** Render the trigger wrapper as a button or span. */
	as?: 'button' | 'span'
	/** Additional CSS classes. */
	class?: string
}>

/** Props for the positioned tooltip panel. */
export type TooltipContentArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'align' | 'arrow' | 'id' | 'popover' | 'role' | 'tabindex' | 'tabIndex' | ReservedPositionArg> & {
	/** Additional CSS classes. */
	class?: string
	/** Inline CSS string. */
	style?: string
}> & FixedArgs<'arrow' | 'gap' | 'id' | 'placement' | 'popover' | 'role' | 'tabindex' | 'tabIndex' | ReservedPositionArg>

type ProviderContextValue = {
	delayDuration: number
	disableHoverableContent: boolean
	markClosed: () => void
	shouldSkipDelay: () => boolean
}

type TooltipContextValue = {
	arrowAttrs: PopupView['arrowAttrs']
	contentId: string
	contentStyle: PopupView['contentStyle']
	disabled: boolean
	open: boolean
	registerContentHover: (hovering: boolean, event?: Event) => void
	registerFocus: (focused: boolean, event?: Event) => void
	registerTriggerHover: (hovering: boolean, event?: Event) => void
	setContent: (element: HTMLDivElement | null) => void
	setTrigger: (element: HTMLElement | null) => void
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
			shouldSkipDelay: () => skipDelayDuration > 0 && Date.now() - lastClosedAt < skipDelayDuration,
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
	let tip: PopupView<HTMLElement, HTMLDivElement>

	tip = popup<HTMLElement, HTMLDivElement>(this, {
		prefix: 'tooltip',
		profile: 'tooltip',
		initialOpen: Boolean(open ?? defaultOpen),
		disabled: () => disabled,
		hover: {
			openDelay: () => delayDuration <= 0 || provider?.shouldSkipDelay() ? 0 : delayDuration,
			closeDelay: () => disableHoverableContent ? 0 : 80,
		},
		onOpenChange: (next, event) => onOpenChange?.(next, event),
		onSync: next => {
			if (!next) provider?.markClosed()
		},
		referenceHidden: 'hide',
		dismiss: {
			prevent: true,
			onDismiss: (event, view) => {
				view.cancelHover()
				view.setOpen(false, event)
			},
		},
	})

	const registerContentHover = (hovering: boolean, event?: Event) => {
		if (hovering) {
			if (!disableHoverableContent) tip.hold('content', event as Event)
		}
		else tip.release('content', event as Event)
	}

	const registerTriggerHover = (hovering: boolean, event?: Event) => {
		if (hovering) tip.hold('trigger', event as Event)
		else tip.release('trigger', event as Event)
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
		const opened = tip.sync(args.open == null ? null : Boolean(args.open), {
			placement: args.placement,
			gap: args.gap,
		})

		TooltipContext({
			...tip,
			disabled,
			open: opened,
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
	gap,
	onOpenChange,
	open,
	placement,
	...attrs
}) => (
	<TooltipRoot
		{...rootAttrs(attrs)}
		defaultOpen={defaultOpen}
		delayDuration={delayDuration}
		disabled={disabled}
		disableHoverableContent={disableHoverableContent}
		gap={gap}
		onOpenChange={onOpenChange}
		open={open}
		placement={placement}
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
	'aria-describedby': describedBy,
	'set:onblur': onBlur,
	'set:onfocus': onFocus,
	'set:onkeydown': onKeydown,
	'set:onmouseleave': onMouseLeave,
	'set:onmouseenter': onMouseEnter,
	...attrs
}) => {
	const tooltip = TooltipContext()
	const disabledFlag = Boolean(disabled ?? tooltip?.disabled)
	const descriptions = [...new Set(
		`${describedBy ?? ''} ${tooltip?.contentId ?? ''}`.trim().split(/\s+/).filter(Boolean),
	)].join(' ') || undefined

	const common = {
		...attrs,
		...triggerAttrs({
			describedby: descriptions,
			id,
			open: Boolean(tooltip?.open),
			ref,
			setTrigger: tooltip?.setTrigger,
			triggerId: tooltip?.triggerId,
		}),
		class: classes,
		'data-slot': slot,
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
	children,
	class: classes,
	'data-slot': slot = 'tooltip-content',
	ref,
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
				id: tooltip?.contentId,
				open: Boolean(tooltip?.open),
				ref,
				setContent: tooltip?.setContent,
				style: tooltip?.contentStyle(style) ?? popupStyle(style),
				tabindex: undefined,
			})}
			class={classes}
			data-arrow="true"
			data-slot={slot}
			role="tooltip"
			set:onmouseleave={(event: MouseEvent) => {
				callHandler(onMouseLeave, event)
				tooltip?.registerContentHover(false, event)
			}}
			set:onmouseenter={(event: MouseEvent) => {
				callHandler(onMouseEnter, event)
				tooltip?.registerContentHover(true, event)
			}}
		>
			<PopupSurface arrow popup={tooltip} />
			{children}
		</div>
	)
}

export {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
}
