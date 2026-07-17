import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import type { Host } from 'ajo-cloves'
import { callHandler, callRef, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'
import { contentAttrs, popup, type PopupView } from './popup'
import { PopupSurface } from './popup-surface'
import type { ReservedPositionArg } from './position'
import { popupStyle, triggerAttrs, type FixedArgs, type OmitArg, type PopupPosition } from './utils'
export type { PopupPlacement, PopupPosition } from './utils'

/** Interaction that opens a popover. */
export type PopoverOpenOn = 'click' | 'hover'

/** Props for the popover root and its controlled open state. */
export type PopoverArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'onchange' | ReservedPositionArg> & PopupPosition & {
	/** Accessible and visible title owned by the popover surface. */
	label: string
	/** Optional visible description associated with the popover surface. */
	description?: string
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
}> & FixedArgs<'onchange' | ReservedPositionArg>

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

/** Props for the positioned popover panel. Semantics come from the root label. */
export type PopoverContentArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'align' | 'aria-describedby' | 'aria-label' | 'aria-labelledby' | 'aria-modal' | 'id' | 'popover' | 'role' | 'tabindex' | 'tabIndex' | ReservedPositionArg> & {
	/** Extends the visual surface toward its positioning reference. */
	arrow?: boolean
	/** Additional CSS classes. */
	class?: string
	/** Inline CSS string. */
	style?: string
}> & FixedArgs<'aria-describedby' | 'aria-label' | 'aria-labelledby' | 'aria-modal' | 'gap' | 'id' | 'placement' | 'popover' | 'role' | 'tabindex' | 'tabIndex' | ReservedPositionArg>

/** Props for an explicit positioning anchor. */
export type PopoverAnchorArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional CSS classes. */
	class?: string
}>

type PopoverContextValue = {
	arrowAttrs: PopupView['arrowAttrs']
	close: (event?: Event) => void
	content: HTMLDivElement | null
	contentId: string
	contentStyle: PopupView['contentStyle']
	description?: string
	disabled: boolean
	label: string
	open: boolean
	openOn: PopoverOpenOn
	openWithDelay?: (event?: Event) => void
	registerContentFocus?: (focused: boolean, event?: Event) => void
	registerContentHover?: (hovering: boolean, event?: Event) => void
	registerTriggerFocus?: (focused: boolean, event?: Event) => void
	registerTriggerHover?: (hovering: boolean, event?: Event) => void
	setReference: (element: HTMLElement | null) => void
	setContent: (element: HTMLDivElement | null) => void
	setOpen: (open: boolean, event?: Event) => void
	setTrigger: (element: HTMLElement | null) => void
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
	let popover: PopupView<HTMLElement, HTMLDivElement>

	popover = popup<HTMLElement, HTMLDivElement>(this, {
		prefix: 'popover',
		profile: 'popover',
		initialOpen: Boolean(initial.open ?? initial.defaultOpen),
		disabled: () => disabled,
		hover: mode === 'hover' ? {
			openDelay: () => openDelay,
			closeDelay: () => closeDelay,
		} : undefined,
		onOpenChange: (next, event) => onOpenChange?.(next, event),
		reference: view => view.reference ?? view.trigger,
		referenceHidden: 'close',
		dismiss: {
			prevent: mode === 'hover',
			outside: true,
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
		const opened = popover.sync(args.open == null ? null : Boolean(args.open), {
			placement: args.placement,
			gap: args.gap,
		})

		PopoverContext({
			...popover,
			close: mode === 'hover' ? close : popover.close,
			description: args.description,
			disabled,
			label: args.label,
			open: opened,
			openOn: mode,
			...(mode === 'hover' ? {
				openWithDelay,
				registerContentFocus,
				registerContentHover,
				registerTriggerFocus,
				registerTriggerHover,
			} : {}),
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
	description,
	disabled,
	gap,
	label,
	onOpenChange,
	open,
	openDelay,
	openOn = 'click',
	placement,
	...attrs
}) => openOn === 'hover' ? (
	<PopoverHoverRoot
		{...rootAttrs(attrs)}
		closeDelay={closeDelay}
		defaultOpen={defaultOpen}
		description={description}
		disabled={disabled}
		gap={gap}
		label={label}
		onOpenChange={onOpenChange}
		open={open}
		openDelay={openDelay}
		placement={placement}
		attr:class={classes}
		attr:data-slot={slot}
	>
		{children}
	</PopoverHoverRoot>
) : (
	<PopoverClickRoot
		{...rootAttrs(attrs)}
		defaultOpen={defaultOpen}
		description={description}
		disabled={disabled}
		gap={gap}
		label={label}
		onOpenChange={onOpenChange}
		open={open}
		placement={placement}
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
				expanded: popover.open,
				haspopup: 'dialog',
				id,
				open: popover.open,
				ref,
				setTrigger: popover.setTrigger,
				triggerId: popover.triggerId,
			}),
			class: classes,
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
				haspopup: 'dialog',
				id,
				open: Boolean(popover?.open),
				ref,
				setTrigger: popover?.setTrigger,
				triggerId: popover?.triggerId,
			})}
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
		popover?.setReference(element)
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

/** Unstyled floating panel for a Popover. */
const PopoverContent: Stateless<PopoverContentArgs> = args => {
	const popover = PopoverContext()
	const titleId = popover ? `${popover.contentId}-title` : undefined
	const descriptionId = popover?.description ? `${popover.contentId}-description` : undefined
	const heading = popover ? (
		<div data-slot="popover-header">
			<h2 data-slot="popover-title" id={titleId}>{popover.label}</h2>
			{popover.description ? (
				<p data-slot="popover-description" id={descriptionId}>{popover.description}</p>
			) : null}
		</div>
	) : null

	if (popover?.openOn === 'hover') {
		const {
			arrow = false,
			children,
			class: classes,
			'data-slot': slot = 'popover-content',
			ref,
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
					id: popover.contentId,
					open: popover.open,
					ref,
					setContent: popover.setContent,
					style: popover.contentStyle(style),
					tabindex: '-1',
				})}
				aria-describedby={descriptionId}
				aria-labelledby={titleId}
				class={classes}
				data-arrow={arrow ? 'true' : undefined}
				data-slot={slot}
				role="dialog"
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
				<PopupSurface arrow={arrow} popup={popover} />
				{heading}
				{children}
			</div>
		)
	}

	const {
		arrow = false,
		children,
		class: classes,
		'data-slot': slot = 'popover-content',
		ref,
		style,
		...attrs
	} = args

	return (
		<div
			{...attrs}
			{...contentAttrs({
				id: popover?.contentId,
				open: Boolean(popover?.open),
				ref,
				setContent: popover?.setContent,
				style: popover?.contentStyle(style) ?? popupStyle(style),
				tabindex: '-1',
			})}
			aria-describedby={descriptionId}
			aria-labelledby={titleId}
			class={classes}
			data-arrow={arrow ? 'true' : undefined}
			data-slot={slot}
			role="dialog"
		>
			<PopupSurface arrow={arrow} popup={popover} />
			{heading}
			{children}
		</div>
	)
}

export {
	Popover,
	PopoverAnchor,
	PopoverContent,
	PopoverTrigger,
}
