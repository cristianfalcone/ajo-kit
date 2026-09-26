import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { callHandler, callRef, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'
import { contentAttrs, hoverTrigger, popup, type PopupPosition, popupStyle, type PopupView, triggerAttrs } from './popup'
import { PopupSurface } from './popup-surface'
import type { FixedArgs, OmitArg } from './utils'
export type { PopupPlacement, PopupPosition } from './popup'

/** Interaction that opens a popover. */
export type PopoverOpenOn = 'click' | 'hover'

/** Props for the popover root and its controlled open state. */
export type PopoverArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'onchange'> & PopupPosition & {
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

/** Props for the positioned popover panel. Semantics come from the root label. */
export type PopoverContentArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'aria-describedby' | 'aria-label' | 'aria-labelledby' | 'aria-modal' | 'id' | 'popover' | 'role' | 'tabindex' | 'tabIndex'> & {
	/** Extends the visual surface toward its positioning reference. */
	arrow?: boolean
	/** Additional CSS classes. */
	class?: string
	/** Inline CSS string. */
	style?: string
}> & FixedArgs<'aria-describedby' | 'aria-label' | 'aria-labelledby' | 'aria-modal' | 'gap' | 'id' | 'placement' | 'popover' | 'role' | 'tabindex' | 'tabIndex'>

/** Props for an explicit positioning anchor. */
export type PopoverAnchorArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional CSS classes. */
	class?: string
}>

type PopoverContextValue = PopupView<HTMLElement, HTMLDivElement> & {
	description?: string
	disabled: boolean
	label: string
	openOn: PopoverOpenOn
}

const PopoverContext = context<PopoverContextValue | null>(null)

const PopoverRoot: Stateful<PopoverArgs> = function* ({ defaultOpen, open, openOn = 'click' }) {
	let closeDelay = 300
	let disabled = false
	let onOpenChange: PopoverArgs['onOpenChange']
	let openDelay = 700
	const hover = openOn === 'hover'

	const popover = popup<HTMLElement, HTMLDivElement>(this, {
		prefix: 'popover',
		profile: 'popover',
		initialOpen: Boolean(open ?? defaultOpen),
		disabled: () => disabled,
		hover: hover ? {
			openDelay: () => openDelay,
			closeDelay: () => closeDelay,
		} : undefined,
		onOpenChange: (next, event) => onOpenChange?.(next, event),
		referenceHidden: 'close',
		dismiss: {
			prevent: hover,
			outside: true,
			onDismiss: (event, view) => {
				view.cancelHover()
				view.close(event, hover ? null : view.trigger)
			},
		},
	})

	for (const args of this) {
		closeDelay = args.closeDelay ?? 300
		disabled = Boolean(args.disabled)
		onOpenChange = args.onOpenChange
		openDelay = args.openDelay ?? 700
		const opened = popover.sync(args.open == null ? null : Boolean(args.open), {
			placement: args.placement,
			gap: args.gap,
		})

		PopoverContext({
			...popover,
			description: args.description,
			disabled,
			label: args.label,
			open: opened,
			openOn,
		})

		yield <>{args.children}</>
	}
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
	openOn,
	placement,
	...attrs
}) => (
	<PopoverRoot
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
		openOn={openOn}
		placement={placement}
		attr:class={classes}
		attr:data-slot={slot}
	>
		{children}
	</PopoverRoot>
)

/** Unstyled button, anchor or span that opens a Popover on click, or on hover and focus in hover mode. */
const PopoverTrigger: Stateless<PopoverTriggerArgs> = args => {
	const {
		as = 'button',
		children,
		'data-slot': slot = 'popover-trigger',
		disabled,
		id,
		ref,
		type = 'button',
		'set:onclick': onClick,
		...attrs
	} = args as PopoverTriggerAllArgs
	const popover = PopoverContext()
	const disabledFlag = Boolean(disabled ?? popover?.disabled)
	const common = {
		...attrs,
		...triggerAttrs({
			controls: popover?.contentId,
			expanded: Boolean(popover?.open),
			haspopup: 'dialog',
			id: popover?.adoptTriggerId(id) ?? id,
			open: Boolean(popover?.open),
			ref,
			setTrigger: popover?.setTrigger,
			triggerId: popover?.triggerId,
		}),
		'data-slot': slot,
		...(popover?.openOn === 'hover' ? {
			...hoverTrigger(popover, attrs, disabledFlag),
			'set:onclick': onClick,
		} : {
			'set:onclick': (event: Event) => {
				callHandler(onClick, event)
				if (event.defaultPrevented || disabledFlag) return
				popover?.setOpen(!popover.open, event)
			},
		}),
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
			<span {...common} aria-disabled={disabledFlag ? 'true' : undefined}>
				{children}
			</span>
		)
	}

	return (
		<button {...common} disabled={disabledFlag} type={type}>
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
const PopoverContent: Stateless<PopoverContentArgs> = ({
	arrow = false,
	children,
	'data-slot': slot = 'popover-content',
	ref,
	style,
	...attrs
}) => {
	const popover = PopoverContext()
	const titleId = popover ? `${popover.contentId}-title` : undefined
	const descriptionId = popover?.description ? `${popover.contentId}-description` : undefined
	// Hover mode keeps the panel open while the pointer or focus is inside it.
	const zones = popover?.openOn === 'hover' ? {
		'set:onfocusin': (event: FocusEvent) => {
			callHandler(attrs['set:onfocusin'], event)
			popover.hold('focus-content', event)
		},
		'set:onfocusout': (event: FocusEvent) => {
			callHandler(attrs['set:onfocusout'], event)
			const next = event.relatedTarget as Node | null
			if (next && (event.currentTarget as HTMLElement).contains(next)) return
			popover.release('focus-content', event)
		},
		'set:onmouseenter': (event: MouseEvent) => {
			callHandler(attrs['set:onmouseenter'], event)
			popover.hold('content', event)
		},
		'set:onmouseleave': (event: MouseEvent) => {
			callHandler(attrs['set:onmouseleave'], event)
			popover.release('content', event)
		},
	} : null

	return (
		<div
			{...attrs}
			{...zones}
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
			data-arrow={arrow ? 'true' : undefined}
			data-slot={slot}
			role="dialog"
		>
			<PopupSurface arrow={arrow} popup={popover} />
			{popover ? (
				<div data-slot="popover-header">
					<h2 data-slot="popover-title" id={titleId}>{popover.label}</h2>
					{popover.description ? (
						<p data-slot="popover-description" id={descriptionId}>{popover.description}</p>
					) : null}
				</div>
			) : null}
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
