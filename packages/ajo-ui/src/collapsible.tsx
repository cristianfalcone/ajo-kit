import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import type { OmitArg } from './utils'
import { callHandler, controlled, dom, id, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'
import { flag } from './utils'

export type CollapsibleArgs = WithChildren<OmitArg<IntrinsicElements['details'], 'open'> & {
	/** Controlled open state. */
	open?: boolean
	/** Initial open state for uncontrolled usage. */
	defaultOpen?: boolean
	/** Disable the trigger. */
	disabled?: boolean
	/** Called whenever open state changes. */
	onOpenChange?: (open: boolean, event?: Event) => void
}>

export type CollapsibleTriggerArgs = WithChildren<IntrinsicElements['summary'] & {
	/** Disable the trigger. */
	disabled?: boolean
	/** Keep the trigger focusable but block toggling. */
	locked?: boolean
}>

export type CollapsibleContentArgs = WithChildren<IntrinsicElements['div']>

type CollapsibleRootArgs = WithChildren<{
	defaultOpen?: boolean
	disabled?: boolean
	onOpenChange?: (open: boolean, event?: Event) => void
	open?: boolean
}>

export type CollapsibleContextValue = {
	contentId: string
	disabled: boolean
	open: boolean
	setOpen: (open: boolean, event?: Event) => void
	triggerId: string
}

/** Composition context shared by Collapsible parts and derivative families such as Accordion. */
export const CollapsibleContext = context<CollapsibleContextValue | null>(null)

const CollapsibleRoot: Stateful<CollapsibleRootArgs, 'details'> = function* ({ defaultOpen, open }) {
	const rootId = id('collapsible')
	let disabled = false
	let onOpenChange: CollapsibleRootArgs['onOpenChange']
	const state = controlled<boolean>(this, {
		fallback: Boolean(open ?? defaultOpen),
		onChange: (next, event) => onOpenChange?.(next, event),
	})

	const syncRoot = () => {
		if (!dom(this)) return

		if (state.value) this.setAttribute('open', '')
		else this.removeAttribute('open')

		this.setAttribute('data-state', state.value ? 'open' : 'closed')
		if (disabled) {
			this.setAttribute('data-disabled', 'true')
			this.setAttribute('aria-disabled', 'true')
		} else {
			this.removeAttribute('data-disabled')
			this.removeAttribute('aria-disabled')
		}
	}

	const setOpen = (next: boolean, event?: Event) => {
		if (disabled || next === state.value) return
		state.set(next, event)
	}

	for (const args of this) {
		disabled = Boolean(args.disabled)
		onOpenChange = args.onOpenChange
		state.sync(args.open != null ? Boolean(args.open) : undefined)

		syncRoot()

		CollapsibleContext({
			contentId: `${rootId}-content`,
			disabled,
			open: state.value,
			setOpen,
			triggerId: `${rootId}-trigger`,
		})

		yield <>{args.children}</>
	}
}

CollapsibleRoot.is = 'details'

/** Unstyled collapsible disclosure rendered as a native details element. */
const Collapsible: Stateless<CollapsibleArgs> = ({
	children,
	defaultOpen,
	disabled,
	onOpenChange,
	open,
	...attrs
}) => {
	const opened = Boolean(open ?? defaultOpen)
	const disabledFlag = Boolean(disabled)

	return (
		<CollapsibleRoot
			attr:data-slot="collapsible"
			{...rootAttrs(attrs)}
			defaultOpen={defaultOpen}
			disabled={disabledFlag}
			onOpenChange={onOpenChange}
			open={open}
			attr:aria-disabled={flag(disabledFlag)}
			attr:data-disabled={flag(disabledFlag)}
			attr:data-state={opened ? 'open' : 'closed'}
			attr:open={opened || undefined}
			set:open={opened}
		>
			{children}
		</CollapsibleRoot>
	)
}

/** Unstyled disclosure trigger rendered as a native summary element. */
const CollapsibleTrigger: Stateless<CollapsibleTriggerArgs> = ({
	children,
	disabled,
	id: idArg,
	locked,
	'set:onclick': onClick,
	...attrs
}) => {
	const collapsible = CollapsibleContext()
	const disabledFlag = Boolean(disabled ?? collapsible?.disabled)
	const unavailable = Boolean(disabledFlag || locked)

	return (
		<summary
			data-slot="collapsible-trigger"
			{...attrs}
			aria-controls={collapsible?.contentId}
			aria-disabled={unavailable ? 'true' : undefined}
			aria-expanded={collapsible?.open ? 'true' : 'false'}
			data-disabled={flag(disabledFlag)}
			data-state={collapsible?.open ? 'open' : 'closed'}
			id={idArg ?? collapsible?.triggerId}
			set:onclick={(event: Event) => {
				callHandler(onClick, event)
				const prevented = event.defaultPrevented
				event.preventDefault()
				if (prevented || unavailable) return
				collapsible?.setOpen(!collapsible.open, event)
			}}
			tabindex={disabledFlag ? -1 : undefined}
		>
			{children}
		</summary>
	)
}

/** Unstyled content panel natively shown or hidden by its details root. */
const CollapsibleContent: Stateless<CollapsibleContentArgs> = ({
	children,
	...attrs
}) => {
	const collapsible = CollapsibleContext()

	return (
		<div
			data-slot="collapsible-content"
			{...attrs}
			aria-labelledby={collapsible?.triggerId}
			data-state={collapsible?.open ? 'open' : 'closed'}
			id={collapsible?.contentId}
		>
			{children}
		</div>
	)
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger }
