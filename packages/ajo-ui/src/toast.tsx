import type { Children, IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { render } from 'ajo'
import { browser, callHandler, hotkey as bindHotkey, id } from 'ajo-cloves'
import { closePopover, openPopover } from './native'
import { popupStyle } from './popup'
import { part, type FixedArgs, type OmitArg } from './utils'

/** Visual tone applied to a toast. */
export type ToastVariant =
	| 'default'
	| 'danger'
	| 'info'
	| 'success'
	| 'warning'

/** Kind of a generated toast, set by the `toast` helper that created it. */
export type ToastKind =
	| 'default'
	| 'error'
	| 'info'
	| 'loading'
	| 'success'
	| 'warning'

/** Fixed viewport position for generated toasts. */
export type ToastPosition =
	| 'bottom-center'
	| 'bottom-left'
	| 'bottom-right'
	| 'top-center'
	| 'top-left'
	| 'top-right'

/** Props for an individual toast item. */
export type ToastArgs = WithChildren<IntrinsicElements['li'] & {
	/** Toast tone used for data attrs and default live-region role. */
	variant?: ToastVariant
	/** Additional classes supplied by a styled wrapper. */
	class?: string
}>

/** Props for an action button associated with a toast. */
export type ToastActionArgs = WithChildren<IntrinsicElements['button'] & {
	/** Alternative text for non-textual actions. */
	altText?: string
	/** Called after the action is selected. */
	onAction?: () => void
	/** Additional classes supplied by a styled wrapper. */
	class?: string
}>

/** Props for a button that dismisses its toast. */
export type ToastCloseArgs = WithChildren<IntrinsicElements['button'] & {
	/** Called after the close button is selected. */
	onClose?: () => void
	/** Additional classes supplied by a styled wrapper. */
	class?: string
}>

/** Shared props for textual toast slots. */
export type ToastSlotArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional classes supplied by a styled wrapper. */
	class?: string
}>

/** Props for a toast's title slot. */
export type ToastTitleArgs = ToastSlotArgs
/** Props for a toast's description slot. */
export type ToastDescriptionArgs = ToastSlotArgs

/** Props for the ordered viewport that displays toast items. */
export type ToastViewportArgs = WithChildren<IntrinsicElements['ol'] & {
	/** Keyboard shortcut shown in the accessible viewport label. */
	hotkey?: string[]
	/** Accessible label for the toast viewport. */
	label?: string
	/** Fixed screen position of the viewport. */
	position?: ToastPosition
	/** Additional classes supplied by a styled wrapper. */
	class?: string
}>

/** Options accepted by `toast()` and its kind helpers. */
export type ToastOptions = {
	/** Stable id. Calling `toast` again with it replaces that toast in place. */
	id?: string
	/** Toast body copy. */
	description?: Children
	/** Action button rendered inside the toast. */
	action?: {
		/** Action label. */
		label: Children
		/** Called when the action is selected. */
		onClick?: () => void
	}
	/** Additional root classes. */
	class?: string
	/** Show this toast's close button. Defaults to the Toaster's `closeButton`. */
	closeButton?: boolean
	/** Auto-dismiss duration in milliseconds; 0 keeps it open. Defaults to the Toaster's `duration`. */
	duration?: number
	/** Announce assertively (`role="alert"`). Error toasts always do. */
	important?: boolean
	/** Fixed screen position. Defaults to the Toaster's `position`. */
	position?: ToastPosition
}

/** Messages for `toast.promise`; success and error may derive from the settled value. */
export type ToastPromiseMessages<T = unknown> = {
	/** Message shown while the promise is pending. */
	loading: Children
	/** Message, or resolver, shown when the promise fulfills. */
	success: Children | ((value: T) => Children)
	/** Message, or resolver, shown when the promise rejects. */
	error: Children | ((error: unknown) => Children)
}

// `ref` is omitted: the runtime routes a stateful component's ref to its
// host, so the viewport element ref cannot be part of the public args.
/** Props for the managed viewports that render generated toasts. */
export type ToasterArgs = OmitArg<ToastViewportArgs, 'children' | 'position' | 'ref'> & {
	/** Position of toasts that set none. */
	position?: ToastPosition
	/** Show every visible toast at full size instead of the compact stack. */
	expand?: boolean
	/** Show close buttons on generated toasts. */
	closeButton?: boolean
	/** Default auto-dismiss duration for generated toasts. */
	duration?: number
	/** Icons rendered before the title, by toast kind. */
	icons?: Partial<Record<ToastKind, Children>>
	/** Maximum visible generated toasts per position. */
	limit?: number
	/** Pause generated toast timers while the window is blurred. */
	pauseOnWindowBlur?: boolean
	/** Content of the generated close buttons. */
	closeChildren?: Children
} & FixedArgs<'children' | 'ref'>

type ToastRecord = ToastOptions & {
	id: string
	kind: ToastKind
	open: boolean
	title: Children
	/** Milliseconds left; unset until a Toaster arms the timer with its default duration. */
	remaining?: number
	startedAt: number
	timeout: ReturnType<typeof setTimeout> | null
}

const closeDelay = 200
const hotkeyDefault = ['F8']
const edgeInset = 16
const stackGap = 8

// Every position keeps a viewport from the Toaster's first render: each is a
// polite live region, and screen readers only announce content ADDED to a
// region already in the accessibility tree.
const positions: ToastPosition[] = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right']

const variants: Record<ToastKind, ToastVariant> = {
	default: 'default',
	error: 'danger',
	info: 'info',
	loading: 'default',
	success: 'success',
	warning: 'warning',
}

// Browser-only store: `add` never writes to it outside a browser, so records
// cannot leak between server renders that share this module.
let records: ToastRecord[] = []
const listeners = new Set<() => void>()

const emit = () => {
	for (const listener of listeners) listener()
}

const clearTimer = (record: ToastRecord) => {
	if (record.timeout) clearTimeout(record.timeout)
	record.timeout = null
}

const startTimer = (record: ToastRecord) => {
	clearTimer(record)
	if (!record.remaining) return

	record.startedAt = Date.now()
	record.timeout = setTimeout(() => dismiss(record.id), record.remaining)
}

const pauseRecord = (record: ToastRecord) => {
	if (!record.timeout) return

	clearTimer(record)
	record.remaining = Math.max(0, record.remaining! - (Date.now() - record.startedAt))
}

const resumeRecord = (record: ToastRecord) => {
	if (!record.open || record.timeout) return
	startTimer(record)
}

const pauseStack = () => {
	for (const record of records) pauseRecord(record)
}

const resumeStack = () => {
	for (const record of records) resumeRecord(record)
}

const add = (kind: ToastKind, title: Children, options: ToastOptions = {}) => {
	const key = options.id ?? id('toast')
	if (!browser()) return key

	const existing = records.find(record => record.id === key)
	const record: ToastRecord = {
		...options,
		duration: options.duration ?? (kind === 'loading' ? 0 : undefined),
		id: key,
		kind,
		open: true,
		startedAt: 0,
		timeout: null,
		title,
	}

	if (existing) clearTimer(existing)
	records = existing ? records.map(current => current === existing ? record : current) : [record, ...records]
	emit()
	return key
}

/** Dismiss one toast by id, or every toast when no id is passed. */
const dismiss = (key?: string) => {
	for (const record of records) {
		if (!record.open || (key != null && record.id !== key)) continue
		clearTimer(record)
		record.open = false
		setTimeout(() => {
			records = records.filter(current => current !== record)
			emit()
		}, closeDelay)
	}
	emit()
}

const resolve = <T,>(message: Children | ((value: T) => Children), value: T) =>
	typeof message === 'function' ? (message as (value: T) => Children)(value) : message

const promise = <T,>(
	task: Promise<T> | (() => Promise<T>),
	messages: ToastPromiseMessages<T>,
	options: ToastOptions = {},
) => {
	const key = add('loading', messages.loading, { ...options, duration: 0 })
	const settled = { ...options, id: key }

	return Promise.resolve().then(() => typeof task === 'function' ? task() : task).then(value => {
		add('success', resolve(messages.success, value), settled)
		return value
	}, (error: unknown) => {
		add('error', resolve(messages.error, error), settled)
		throw error
	})
}

const kind = (type: ToastKind) => (message: Children, options?: ToastOptions) => add(type, message, options)

/**
 * Show a toast and return its id. Calling again with `{ id }` replaces that
 * toast; `toast.dismiss(id)` closes it. Outside a browser it only returns an id.
 */
export const toast = Object.assign(kind('default'), {
	error: kind('error'),
	info: kind('info'),
	loading: kind('loading'),
	success: kind('success'),
	warning: kind('warning'),
	/** Show a loading toast that becomes a success or error toast when `task` settles. */
	promise,
	dismiss,
})

const composeClick = (
	previous: unknown,
	next: (() => void) | undefined,
) => (event: MouseEvent) => {
	callHandler(previous, event)
	next?.()
}

// Inline corner placement per position. The popupStyle reset zeroes the UA
// popover inset, and inline declarations are the only ones that can win over
// that reset, so the operative placement lives here.
const viewportInsets: Record<ToastPosition, string> = {
	'bottom-center': 'bottom:0;left:50%;transform:translateX(-50%)',
	'bottom-left': 'bottom:0;left:0',
	'bottom-right': 'bottom:0;right:0',
	'top-center': 'top:0;left:50%;transform:translateX(-50%)',
	'top-left': 'top:0;left:0',
	'top-right': 'top:0;right:0',
}

/** Toast viewport where generated or manually composed toasts are rendered. */
const ToastViewport: Stateless<ToastViewportArgs> = ({
	children,
	class: classes,
	hotkey = hotkeyDefault,
	label,
	position = 'bottom-right',
	style,
	tabIndex = -1,
	...attrs
}) => {
	const hotkeyText = hotkey.join('+')

	return (
		<ol
			{...attrs}
			aria-atomic="false"
			aria-label={label ?? `Notifications (${hotkeyText})`}
			aria-live="polite"
			class={classes}
			data-hotkey={hotkeyText}
			data-position={position}
			data-slot="toast-viewport"
			popover="manual"
			role="region"
			style={popupStyle(
				// Beyond inset/margin, the UA popover rule paints a bordered
				// Canvas box and clips overflow; the viewport is a transparent
				// stacking container whose behind toasts peek past its box, so
				// restore those to neutral before placing the corner.
				'border:none;background:transparent;color:inherit;overflow:visible',
				viewportInsets[position],
				style,
			)}
			tabIndex={tabIndex}
		>
			{children}
		</ol>
	)
}

/** Toast root for composed notifications. */
const Toast: Stateless<ToastArgs> = ({
	children,
	class: classes,
	role,
	variant = 'default',
	...attrs
}) => (
	<li
		{...attrs}
		class={classes}
		data-slot="toast"
		data-state="open"
		data-variant={variant}
		role={role ?? (variant === 'danger' ? 'alert' : 'status')}
	>
		{children}
	</li>
)

/** Toast title slot. */
const ToastTitle = part<ToastTitleArgs>('div', 'toast-title')

/** Toast description slot. */
const ToastDescription = part<ToastDescriptionArgs>('div', 'toast-description')

/** Toast action button. */
const ToastAction: Stateless<ToastActionArgs> = ({
	altText,
	children,
	class: classes,
	onAction,
	type = 'button',
	'set:onclick': setOnClick,
	...attrs
}) => (
	<button
		{...attrs}
		aria-label={altText}
		class={classes}
		data-slot="toast-action"
		set:onclick={composeClick(setOnClick, onAction)}
		type={type}
	>
		{children}
	</button>
)

/** Toast close button. */
const ToastClose: Stateless<ToastCloseArgs> = ({
	children,
	class: classes,
	onClose,
	type = 'button',
	'set:onclick': setOnClick,
	...attrs
}) => (
	<button
		{...attrs}
		aria-label={attrs['aria-label'] ?? 'Close'}
		class={classes}
		data-slot="toast-close"
		set:onclick={(event: MouseEvent) => {
			const target = event.currentTarget as HTMLElement
			target.closest<HTMLElement>('[data-slot="toast-viewport"]')?.focus()
			composeClick(setOnClick, onClose)(event)
		}}
		type={type}
	>
		{children}
	</button>
)

/**
 * Render generated toasts from the module-level store in one viewport per
 * position, each mounted and shown from the first render.
 */
const Toaster: Stateful<ToasterArgs> = function* () {
	let portalMount: HTMLElement | null = null
	let portalWatch: MutationObserver | null = null
	let renderPortal: ((empty: boolean) => void) | null = null
	const modals: HTMLDialogElement[] = []
	const heights = new Map<string, number>()
	let hovered: ToastPosition | null = null
	let front: ToastPosition = 'bottom-right'
	let hotkey = hotkeyDefault
	let pauseOnWindowBlur = true

	// While a modal dialog hosts the portal, the toasts live there: the
	// active viewports are wherever they currently render.
	const active = (): ParentNode => portalMount ?? this

	const measure = () => {
		const known = new Set(records.map(record => record.id))
		let changed = false
		for (const key of Array.from(heights.keys())) {
			if (!known.has(key)) heights.delete(key)
		}
		for (const element of Array.from(active().querySelectorAll<HTMLElement>('[data-slot="toast"]'))) {
			const key = element.dataset.toastId
			if (!key || !known.has(key)) continue
			const height = element.offsetHeight
			if (heights.get(key) !== height) {
				heights.set(key, height)
				changed = true
			}
		}
		if (changed) this.next()
	}

	// Viewport top-layer lifecycle: shown from mount onward, empty included,
	// because each viewport is a live region (see `positions`). A shown-but-empty
	// viewport is harmless (pointer-events-none); hide+show happens ONLY for
	// the epoch re-promotion below. openPopover/closePopover guard missing
	// support, repeat calls, and InvalidStateError.
	//
	// Modal nuance, verified against Chromium: "hide all popovers" only pops
	// the auto stack, so showModal() leaves a shown manual viewport open but
	// BELOW the later-promoted <dialog> (top-layer order is promotion order).
	// The epochs track modals promoted after our last show; hide+show in the
	// same task (no paint in between) moves the viewports back above. Gating
	// on the epoch keeps re-promotion to once per modal, so ordinary emits do
	// not flip display and replay the toasts' @starting-style enter
	// transitions.
	let topLayerEpoch = 0
	let promotedEpoch = 0

	const syncViewport = () => {
		for (const viewport of Array.from(this.children) as HTMLElement[]) {
			if (promotedEpoch < topLayerEpoch) closePopover(viewport)
			openPopover(viewport)
		}
		promotedEpoch = topLayerEpoch
	}

	const syncPortal = () => {
		if (!portalMount?.isConnected) return
		for (const viewport of Array.from(portalMount.children) as HTMLElement[]) openPopover(viewport)
	}

	// Foreign hides (an engine hiding popovers on showModal, or an outside
	// hidePopover call) re-show: the live regions must stay present. Our own
	// hide only happens during epoch re-promotion, which reopens synchronously
	// before this microtask runs, so neither can loop. Deferred to a microtask
	// so the re-show lands after the hide settles. Tearing a portal viewport
	// down never lands here: removal-triggered popover hides fire no toggle.
	const onViewportToggle = (event: ToggleEvent) => {
		if (event.newState !== 'closed') return
		queueMicrotask(() => {
			syncViewport()
			syncPortal()
		})
	}

	// Portal root: while a modal dialog exposing a portal outlet is open, the
	// toasts render through a second ajo root inside the dialog subtree — the
	// only place the platform lets them stay interactive: everything outside
	// a modal is inert no matter how it stacks, so root-rendered toasts paint
	// above the dialog but never win a hit test (clicks fall through to the
	// backdrop and light-dismiss the dialog), and their live region is pruned
	// from the accessibility tree. The outlet carries `skip`, so the dialog's
	// own tree never reconciles the portal DOM. The root viewports meanwhile
	// stay shown-but-empty, keeping their polite live regions alive for the
	// next root-rendered toast. Modals without an outlet (raw dialogs) keep
	// the old visible-but-inert behavior.
	const portalOutlet = (dialog: HTMLDialogElement) =>
		Array.from(dialog.querySelectorAll<HTMLElement>('[data-slot="dialog-portal"]'))
			.find(element => element.closest('dialog') === dialog) ?? null

	// Only the TOPMOST open modal decides: with stacked modals everything
	// below the top one is inert too, so falling through to a lower outlet
	// would trap the toasts inert and painted under the topmost backdrop.
	// A topmost modal without an outlet returns null — the toasts fall back
	// to the root viewports (visible-but-inert above the modal).
	const portalTarget = () => {
		for (let index = modals.length - 1; index >= 0; index--) {
			const dialog = modals[index]
			if (!dialog.isConnected || !dialog.open) {
				modals.splice(index, 1)
				continue
			}
			return portalOutlet(dialog)
		}
		return null
	}

	// A tracked dialog can leave the DOM without a toggle the document
	// listener can see (a dialog closed and removed in the same task fires
	// its toggle disconnected, and an unmounted-while-open dialog fires
	// nothing); watch for disconnections while any modal is tracked, or the
	// toasts stay stranded until the next store emit.
	const syncWatch = () => {
		const wanted = Boolean(portalMount) || modals.length > 0
		if (wanted && !portalWatch) {
			portalWatch = new MutationObserver(() => {
				if ((portalMount && !portalMount.isConnected) || modals.some(dialog => !dialog.isConnected)) rehome()
			})
			portalWatch.observe(this.ownerDocument.documentElement, { childList: true, subtree: true })
		} else if (!wanted && portalWatch) {
			portalWatch.disconnect()
			portalWatch = null
		}
	}

	const unmountPortal = () => {
		if (!portalMount) return
		render(null, portalMount)
		portalMount.remove()
		portalMount = null
	}

	const rehome = () => {
		const outlet = portalTarget()
		if (outlet !== (portalMount?.parentElement ?? null)) {
			unmountPortal()
			if (outlet) {
				portalMount = this.ownerDocument.createElement('div')
				portalMount.style.display = 'contents'
				outlet.append(portalMount)
				// Two-phase mount: show the EMPTY portal regions now so a
				// toast arriving in the upcoming render is an addition to an
				// existing live region.
				renderPortal?.(true)
			}
			// The pointer's hover chain broke with the swap; resume and let
			// a fresh pointerenter on the new viewport re-pause.
			if (hovered) {
				hovered = null
				resumeStack()
			}
			this.next()
		}
		syncWatch()
	}

	// Modal dialogs fire toggle events on open and close; capture them
	// document-wide (toggle does not bubble). A modal opening AFTER the
	// viewports were shown re-promotes them, and a modal exposing a portal
	// outlet re-homes the toasts into its subtree. Non-modal show() never
	// enters the top layer, so it neither bumps the epoch nor hosts toasts.
	const onTopLayerToggle = (event: Event) => {
		const target = event.target as Element | null
		if (!(target instanceof HTMLDialogElement)) return
		const state = (event as ToggleEvent).newState
		if (state === 'open' && target.matches(':modal')) {
			topLayerEpoch++
			if (!modals.includes(target)) modals.push(target)
			queueMicrotask(() => {
				syncViewport()
				rehome()
			})
		} else if (state === 'closed' && modals.includes(target)) {
			modals.splice(modals.indexOf(target), 1)
			queueMicrotask(rehome)
		}
	}

	const sync = () => this.next()
	listeners.add(sync)
	this.signal.addEventListener('abort', () => {
		listeners.delete(sync)
		portalWatch?.disconnect()
		portalWatch = null
		unmountPortal()
	}, { once: true })

	const onWindow = (event: Event) => {
		if (!pauseOnWindowBlur) return
		if (event.type === 'blur') pauseStack()
		else resumeStack()
	}

	bindHotkey(this, {
		keys: () => hotkey.join('+'),
		active: () => records.length > 0,
		onPress: () => active().querySelector<HTMLElement>(`[data-slot="toast-viewport"][data-position="${front}"]`)?.focus(),
	})

	if (browser()) {
		const owner = this.ownerDocument
		owner.defaultView?.addEventListener('blur', onWindow, { signal: this.signal })
		owner.defaultView?.addEventListener('focus', onWindow, { signal: this.signal })
		owner.addEventListener('toggle', onTopLayerToggle, { capture: true, signal: this.signal })
		// Modals already open before this Toaster mounted never fire a toggle
		// we can see; seed them so the first render can portal into them.
		for (const dialog of Array.from(owner.querySelectorAll<HTMLDialogElement>('dialog'))) {
			if (dialog.matches(':modal')) modals.push(dialog)
		}
	}

	for (const {
		class: classes,
		closeButton = true,
		closeChildren,
		duration = 5000,
		expand = false,
		hotkey: keys = hotkeyDefault,
		icons,
		label,
		limit = 3,
		pauseOnWindowBlur: pause = true,
		position = 'bottom-right',
		...attrs
	} of this) {
		hotkey = keys
		pauseOnWindowBlur = pause
		front = records[0]?.position ?? position

		// A toast's timer starts once a Toaster shows it, with this Toaster's
		// default duration when the toast set none.
		for (const record of records) {
			if (record.remaining != null) continue
			record.remaining = record.duration ?? duration
			startTimer(record)
		}

		// A toast fired while the pointer rests on the stack starts its timer
		// (pointerenter cannot re-fire under a stationary pointer); re-pause
		// here so the newcomer freezes with the rest. pauseRecord is idempotent.
		if (hovered) pauseStack()

		const stack = (at: ToastPosition, items: ToastRecord[], portal: boolean) => {
			const bottom = at.startsWith('bottom')
			const lift = bottom ? -1 : 1
			const expanded = expand || hovered === at
			const frontHeight = heights.get(items[0]?.id ?? '') ?? 0
			const open = items.filter(item => item.open)
			const stackHeight = edgeInset + (expanded
				? open.reduce((total, item) => total + (heights.get(item.id) ?? 0), 0) + Math.max(0, open.length - 1) * stackGap
				: frontHeight)

			return (
				<ToastViewport
					key={at}
					{...attrs}
					class={classes}
					data-portal={portal ? 'true' : undefined}
					hotkey={keys}
					// A caller-passed id must stay unique: only the root
					// viewport of the default position keeps it.
					id={portal || at !== position ? undefined : attrs.id}
					label={label}
					position={at}
					style={`--front-toast-height:${frontHeight}px;--toast-gap:${stackGap}px;height:${stackHeight}px`}
					set:ontoggle={onViewportToggle}
					set:onpointerenter={() => {
						if (hovered === at) return
						hovered = at
						pauseStack()
						this.next()
					}}
					set:onpointerleave={() => {
						if (hovered !== at) return
						hovered = null
						resumeStack()
						this.next()
					}}
				>
					{items.map((item, index) => {
						const depth = Math.min(index, 2)
						const offset = expanded
							? items.slice(0, index).reduce((total, prior) => prior.open ? total + (heights.get(prior.id) ?? 0) + stackGap : total, 0)
							: depth * 14
						const icon = icons?.[item.kind]

						return (
							<Toast
								class={item.class}
								data-closing={item.open ? 'false' : 'true'}
								data-expanded={expanded ? 'true' : 'false'}
								data-front={index === 0 ? 'true' : 'false'}
								data-side={bottom ? 'bottom' : 'top'}
								data-toast-id={item.id}
								data-toast-index={index}
								key={item.id}
								role={item.important || item.kind === 'error' ? 'alert' : 'status'}
								set:onfocusin={() => pauseRecord(item)}
								set:onfocusout={() => resumeRecord(item)}
								set:onpointerenter={() => pauseRecord(item)}
								set:onpointerleave={() => {
									if (!hovered) resumeRecord(item)
								}}
								style={[
									`--toast-y:${lift * offset}px`,
									`--toast-scale:${expanded ? 1 : 1 - depth * 0.04}`,
									`z-index:${100 - index}`,
								].join(';')}
								variant={variants[item.kind]}
							>
								<div data-slot="toast-content">
									<ToastTitle>
										{icon == null ? null : <span data-slot="toast-icon">{icon}</span>}
										{item.title}
									</ToastTitle>
									{item.description == null ? null : <ToastDescription>{item.description}</ToastDescription>}
								</div>
								{item.action == null ? null : (
									<div data-slot="toast-action-wrapper">
										<ToastAction onAction={item.action.onClick}>{item.action.label}</ToastAction>
									</div>
								)}
								{(item.closeButton ?? closeButton) ? (
									<ToastClose onClose={() => dismiss(item.id)}>
										{closeChildren}
									</ToastClose>
								) : null}
							</Toast>
						)
					})}
				</ToastViewport>
			)
		}

		// One builder, two roots: the yielded tree renders the root viewports
		// (empty while a portal hosts the toasts), and the portal root renders
		// the same viewports inside the open modal's outlet.
		const view = (portal: boolean, empty: boolean) => positions.map(at => stack(
			at,
			empty ? [] : records.filter(record => (record.position ?? position) === at).slice(0, limit),
			portal,
		))

		renderPortal = empty => {
			if (!portalMount?.isConnected) return
			render(view(true, empty), portalMount)
			syncPortal()
		}

		// Show before measuring: a hidden popover viewport measures 0. The
		// portal render rides the same microtask, so the second root never
		// mounts from inside another component's render pass. A portal whose
		// host dialog vanished without a close event re-homes here, and a
		// modal seeded at mount (opened before this Toaster existed) gets
		// its portal on the first render.
		if (browser()) queueMicrotask(() => {
			if (portalMount?.isConnected) {
				renderPortal?.(false)
			} else if (portalMount || (modals.length && portalTarget())) {
				rehome()
			}
			syncViewport()
			measure()
		})

		yield view(false, Boolean(portalMount))
	}
}

Toaster.attrs = { 'data-slot': 'toaster' }

export {
	Toaster,
	Toast,
	ToastAction,
	ToastClose,
	ToastDescription,
	ToastTitle,
	ToastViewport,
}
