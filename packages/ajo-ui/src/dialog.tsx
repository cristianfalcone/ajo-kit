import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { callHandler, callRef, controlled, id, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'
import { triggerAttrs } from './utils'
import type { FixedArgs, OmitArg } from './utils'

/** Arguments for the Dialog state provider and its wrapper host. */
export type DialogArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'onchange'> & {
	/** Controlled open state. */
	open?: boolean
	/** Initial open state for uncontrolled usage. */
	defaultOpen?: boolean
	/** Use native modal behavior. Set false for modeless dialogs. */
	modal?: boolean
	/** Called whenever the dialog opens or closes. */
	onOpenChange?: (open: boolean, event?: Event) => void
	/** Additional CSS classes for the root wrapper. */
	class?: string
}> & FixedArgs<'onchange'>

/** Arguments for the button that opens its nearest Dialog. */
export type DialogTriggerArgs = WithChildren<IntrinsicElements['button'] & {
	/** Additional CSS classes. */
	class?: string
}>

/** Arguments for a button that closes its nearest Dialog. */
export type DialogCloseArgs = WithChildren<IntrinsicElements['button'] & {
	/** Additional CSS classes. */
	class?: string
}>

/** Arguments for the native dialog panel and its dismissal hooks. */
export type DialogContentArgs = WithChildren<OmitArg<IntrinsicElements['dialog'], 'open'> & {
	/** Called when Escape requests dialog close. Prevent default to keep it open. */
	onEscapeKeyDown?: (event: KeyboardEvent) => void
	/** Called when the native backdrop is clicked. Prevent default to keep it open. */
	onPointerDownOutside?: (event: MouseEvent) => void
	/** Additional CSS classes for the dialog panel. */
	class?: string
}> & FixedArgs<'open'>

/** Shared arguments for structural sections inside a dialog panel. */
export type DialogSectionArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional CSS classes. */
	class?: string
}>

/** Arguments for the title and description area of a dialog. */
export type DialogHeaderArgs = DialogSectionArgs

/** Arguments for the action area at the end of a dialog. */
export type DialogFooterArgs = DialogSectionArgs

/** Arguments for the heading that labels DialogContent. */
export type DialogTitleArgs = WithChildren<IntrinsicElements['h2'] & {
	/** Additional CSS classes. */
	class?: string
}>

/** Arguments for the text that describes DialogContent. */
export type DialogDescriptionArgs = WithChildren<IntrinsicElements['p'] & {
	/** Additional CSS classes. */
	class?: string
}>

type DialogContextValue = {
	close: (event?: Event) => void
	contentId: string
	descriptionId: string
	modal: boolean
	open: boolean
	setContent: (element: HTMLDialogElement | null) => void
	setOpen: (open: boolean, event?: Event) => void
	setTrigger: (element: HTMLButtonElement | null) => void
	titleId: string
	triggerId: string
}

const DialogContext = context<DialogContextValue | null>(null)

const dialog = () => {
	const value = DialogContext()
	if (!value) throw new Error('Dialog component must be used within Dialog.')
	return value
}

const outside = (element: HTMLDialogElement, event: MouseEvent) => {
	const rect = element.getBoundingClientRect()
	return event.clientX < rect.left ||
		event.clientX > rect.right ||
		event.clientY < rect.top ||
		event.clientY > rect.bottom
}

const DialogRoot: Stateful<DialogArgs> = function* ({ defaultOpen, open }) {
	const dialogId = id('dialog')
	const watched = new WeakSet<HTMLDialogElement>()
	let content: HTMLDialogElement | null = null
	let modal = true
	let onOpenChange: DialogArgs['onOpenChange']
	let syncing = false
	let trigger: HTMLButtonElement | null = null
	const state = controlled<boolean>(this, {
		fallback: Boolean(open ?? defaultOpen),
		onChange: (next, event) => onOpenChange?.(next, event),
	})
	let current = state.value

	const focusTrigger = () => queueMicrotask(() => trigger?.focus())

	const sync = () => queueMicrotask(() => {
		if (!content) return
		syncing = true

		try {
			if (current && !content.open) {
				if (modal) content.showModal()
				else content.show()
			} else if (!current && content.open) {
				content.close()
			}
		} finally {
			queueMicrotask(() => syncing = false)
		}
	})

	const setOpen = (next: boolean, event?: Event) => {
		if (next === current) return
		state.set(next, event)
		current = state.value
		sync()
		if (!next) focusTrigger()
	}

	const setContent = (element: HTMLDialogElement | null) => {
		content = element
		if (!element || watched.has(element)) return

		watched.add(element)
		element.addEventListener('close', event => {
			if (syncing || current === false) return
			state.accept(false, event)
			current = state.value
			focusTrigger()
		}, { signal: this.signal })
	}

	for (const args of this) {
		modal = args.modal !== false
		onOpenChange = args.onOpenChange
		current = state.sync(args.open == null ? undefined : Boolean(args.open))

		DialogContext({
			close: event => setOpen(false, event),
			contentId: `${dialogId}-content`,
			descriptionId: `${dialogId}-description`,
			modal,
			open: current,
			setContent,
			setOpen,
			setTrigger: element => trigger = element,
			titleId: `${dialogId}-title`,
			triggerId: `${dialogId}-trigger`,
		})

		sync()
		yield <>{args.children}</>
	}
}


/** Unstyled root provider for a native dialog. */
const Dialog: Stateless<DialogArgs> = ({
	children,
	class: classes,
	'data-slot': slot = 'dialog',
	defaultOpen,
	modal,
	onOpenChange,
	open,
	...attrs
}) => (
	<DialogRoot
		{...rootAttrs(attrs)}
		defaultOpen={defaultOpen}
		modal={modal}
		onOpenChange={onOpenChange}
		open={open}
		attr:class={classes}
		attr:data-slot={slot}
	>
		{children}
	</DialogRoot>
)

/** Unstyled button that opens the nearest Dialog. */
const DialogTrigger: Stateless<DialogTriggerArgs> = ({
	children,
	'data-slot': slot = 'dialog-trigger',
	disabled,
	id,
	ref,
	type = 'button',
	'set:onclick': onClick,
	...attrs
}) => {
	const ctx = dialog()

	return (
		<button
			{...attrs}
			{...triggerAttrs({
				controls: ctx.contentId,
				expanded: ctx.open,
				id,
				open: ctx.open,
				ref,
				setTrigger: ctx.setTrigger,
				triggerId: ctx.triggerId,
			})}
			data-slot={slot}
			disabled={disabled}
			type={type}
			set:onclick={(event: Event) => {
				callHandler(onClick, event)
				if (event.defaultPrevented || disabled) return
				ctx.setOpen(true, event)
			}}
		>
			{children}
		</button>
	)
}

/** Unstyled button that closes the nearest Dialog. */
const DialogClose: Stateless<DialogCloseArgs> = ({
	children,
	'data-slot': slot = 'dialog-close',
	disabled,
	type = 'button',
	'set:onclick': onClick,
	...attrs
}) => {
	const ctx = dialog()

	return (
		<button
			{...attrs}
			data-slot={slot}
			disabled={disabled}
			type={type}
			set:onclick={(event: Event) => {
				callHandler(onClick, event)
				if (event.defaultPrevented || disabled) return
				ctx.close(event)
			}}
		>
			{children}
		</button>
	)
}

/** Unstyled native dialog panel. */
const DialogContent: Stateless<DialogContentArgs> = ({
	children,
	class: classes,
	'data-slot': slot = 'dialog-content',
	onEscapeKeyDown,
	onPointerDownOutside,
	ref,
	'aria-describedby': describedBy,
	'aria-labelledby': labelledBy,
	'set:oncancel': onCancel,
	'set:onclick': onClick,
	'set:onkeydown': onKeydown,
	...attrs
}) => {
	const ctx = dialog()
	const reference = (element: HTMLDialogElement | null) => {
		ctx.setContent(element)
		callRef(ref, element)
	}

	return (
		<dialog
			{...attrs}
			aria-describedby={describedBy ?? ctx.descriptionId}
			aria-labelledby={labelledBy ?? ctx.titleId}
			aria-modal={ctx.modal ? 'true' : undefined}
			class={classes}
			data-slot={slot}
			data-state={ctx.open ? 'open' : 'closed'}
			id={ctx.contentId}
			ref={reference}
			set:oncancel={(event: Event) => {
				callHandler(onCancel, event)
				if (event.defaultPrevented) return
				if (event.cancelable) event.preventDefault()
				ctx.close(event)
			}}
			set:onclick={(event: MouseEvent) => {
				callHandler(onClick, event)
				if (event.defaultPrevented) return
				const target = event.currentTarget as HTMLDialogElement
				if (event.target === target && outside(target, event)) {
					onPointerDownOutside?.(event)
					if (!event.defaultPrevented) ctx.close(event)
				}
			}}
			set:onkeydown={(event: KeyboardEvent) => {
				if (event.key === 'Escape') onEscapeKeyDown?.(event)
				callHandler(onKeydown, event)
			}}
		>
			{children}
			{/* Portal outlet for top-layer UI that must stay interactive while
			    this dialog is modal (everything outside the dialog subtree is
			    inert). The Toaster re-homes its viewport here through a second
			    render root; `skip` keeps that root's DOM out of this tree's
			    reconciliation, the `key` keeps sibling churn in the dialog's
			    children from ever claiming this element (unkeyed matching
			    pairs by tag name alone), and display:contents keeps the
			    outlet out of the panel's layout. */}
			<div data-slot="dialog-portal" key="dialog-portal" skip style="display:contents" />
		</dialog>
	)
}

/** Unstyled header area for dialog title and description. */
const DialogHeader: Stateless<DialogHeaderArgs> = ({
	children,
	'data-slot': slot = 'dialog-header',
	...attrs
}) => (
	<div {...attrs} data-slot={slot}>
		{children}
	</div>
)

/** Unstyled footer area for dialog actions. */
const DialogFooter: Stateless<DialogFooterArgs> = ({
	children,
	'data-slot': slot = 'dialog-footer',
	...attrs
}) => (
	<div {...attrs} data-slot={slot}>
		{children}
	</div>
)

/** Accessible title for DialogContent. */
const DialogTitle: Stateless<DialogTitleArgs> = ({
	children,
	'data-slot': slot = 'dialog-title',
	id,
	...attrs
}) => {
	const ctx = DialogContext()

	return (
		<h2 {...attrs} data-slot={slot} id={id ?? ctx?.titleId}>
			{children}
		</h2>
	)
}

/** Accessible description for DialogContent. */
const DialogDescription: Stateless<DialogDescriptionArgs> = ({
	children,
	'data-slot': slot = 'dialog-description',
	id,
	...attrs
}) => {
	const ctx = DialogContext()

	return (
		<p {...attrs} data-slot={slot} id={id ?? ctx?.descriptionId}>
			{children}
		</p>
	)
}

export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
}
