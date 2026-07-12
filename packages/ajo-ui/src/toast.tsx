import type { Children, IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { render } from 'ajo'
import { browser, callHandler, hotkey as bindHotkey, id } from 'ajo-cloves'
import { popupStyle } from './floating'
import type { FixedArgs, OmitArg } from './utils'
import { closePopover, clx, openPopover, toNumber } from './utils'

export type ToastVariant =
	| 'default'
	| 'danger'

export type ToastType =
	| 'background'
	| 'foreground'

export type ToastPosition =
	| 'bottom-center'
	| 'bottom-left'
	| 'bottom-right'
	| 'top-center'
	| 'top-left'
	| 'top-right'

export type ToastArgs = WithChildren<IntrinsicElements['li'] & {
	/** Controlled visibility. Hidden toasts are not rendered. */
	open?: boolean
	/** Toast priority hint for live-region behavior. */
	type?: ToastType
	/** Toast tone used for data attrs and default live-region role. */
	variant?: ToastVariant
	/** Additional classes supplied by a styled wrapper. */
	class?: string
}>

export type ToastActionArgs = WithChildren<IntrinsicElements['button'] & {
	/** Alternative text for non-textual actions. */
	altText?: string
	/** Called after the action is selected. */
	onAction?: () => void
	/** Additional classes supplied by a styled wrapper. */
	class?: string
}>

export type ToastCloseArgs = WithChildren<IntrinsicElements['button'] & {
	/** Called after the close button is selected. */
	onClose?: () => void
	/** Additional classes supplied by a styled wrapper. */
	class?: string
}>

export type ToastSlotArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional classes supplied by a styled wrapper. */
	class?: string
}>

export type ToastTitleArgs = ToastSlotArgs
export type ToastDescriptionArgs = ToastSlotArgs

export type ToastViewportArgs = WithChildren<IntrinsicElements['ol'] & {
	/** Keyboard shortcut shown in the accessible viewport label. */
	hotkey?: string[]
	/** Accessible label for the toast viewport. */
	label?: string
	/** Native popover mode. Manual keeps toasts above modal dialogs without light dismiss. */
	popover?: 'auto' | 'manual'
	/** Fixed screen position for generated toasts. */
	position?: ToastPosition
	/** Additional classes supplied by a styled wrapper. */
	class?: string
}>

export type ToastProviderArgs = WithChildren<{
	/** Default auto-dismiss duration for generated toasts. */
	duration?: number
	/** Accessible label for generated toast viewports. */
	label?: string
}>

export type ToastInput = {
	/** Stable id for updating or dismissing this toast. */
	id?: string
	/** Toast title. */
	title?: unknown
	/** Toast body copy. */
	description?: unknown
	/** Optional action element. Prefer ToastAction. */
	action?: unknown
	/** Additional root classes. */
	class?: string
	/** Show this generated toast's close button. */
	closeButton?: boolean
	/** Auto-dismiss duration in milliseconds. Pass 0 to keep it open. */
	duration?: number
	/** Fixed screen position for this generated toast. */
	position?: ToastPosition
	/** Accessible role. Defaults to status, or alert for danger toasts. */
	role?: string
	/** Toast priority hint for live-region behavior. */
	type?: ToastType
	/** Toast tone used for data attrs and default live-region role. */
	variant?: ToastVariant
}

export type ToastController = {
	id: string
	dismiss: () => void
	update: (patch: ToastInput) => void
}

export type ToastView = ToastInput & {
	id: string
	open: boolean
}

// `ref` is omitted: the runtime routes a stateful component's ref to its
// host, so the viewport element ref cannot be part of the public args.
export type ToasterArgs = OmitArg<ToastViewportArgs, 'children' | 'ref'> & {
	/** Show every visible toast at full size instead of the compact stack. */
	expand?: boolean
	/** Show close buttons on generated toasts. */
	closeButton?: boolean
	/** Default auto-dismiss duration for generated toasts. */
	duration?: number
	/** Maximum visible generated toasts. */
	limit?: number
	/** Pause generated toast timers while the window is blurred. */
	pauseOnWindowBlur?: boolean
	contentClass?: string
	actionWrapperClass?: string
	closeClass?: string
	closeChildren?: Children
	descriptionClass?: string
	titleClass?: string
	toastClass?: string | ((toast: ToastView) => string | undefined)
} & FixedArgs<'children' | 'ref'>

type ToastRecord = ToastInput & {
	id: string
	open: boolean
	remaining: number
	startedAt: number
	timeout: ReturnType<typeof setTimeout> | null
}

type ToastListener = () => void

const defaultDuration = 5000
const defaultLimit = 3
const closeDelay = 200
const hotkeyDefault = ['F8']
const edgeInset = 16
const stackGap = 8

let records: ToastRecord[] = []
let configuredDuration = defaultDuration
let configuredLabel: string | undefined
let configuredPosition: ToastPosition = 'bottom-right'
const listeners = new Set<ToastListener>()

const emit = () => {
	for (const listener of listeners) listener()
}

const clearTimer = (record: ToastRecord) => {
	if (record.timeout) clearTimeout(record.timeout)
	record.timeout = null
}

const removeToast = (id: string) => {
	records = records.filter(record => record.id !== id)
	emit()
}

const startTimer = (record: ToastRecord) => {
	clearTimer(record)
	if (!browser() || record.remaining <= 0) return

	record.startedAt = Date.now()
	record.timeout = setTimeout(() => dismissToast(record.id), record.remaining)
}

const pauseRecord = (record: ToastRecord) => {
	if (!record.timeout) return

	clearTimer(record)
	record.remaining = Math.max(0, record.remaining - (Date.now() - record.startedAt))
}

const resumeRecord = (record: ToastRecord) => {
	if (!record.open || record.timeout || record.remaining <= 0) return
	startTimer(record)
}

const normalize = (input: ToastInput | unknown, options?: Omit<ToastInput, 'title'>): ToastInput => {
	if (
		input &&
		typeof input === 'object' &&
		(
			'id' in input ||
			'title' in input ||
			'description' in input ||
			'action' in input ||
			'closeButton' in input ||
			'variant' in input ||
			'duration' in input ||
			'position' in input
		)
	) return input as ToastInput

	return { ...options, title: input }
}

const visibleToasts = (limit = defaultLimit, position?: ToastPosition) => {
	const scoped = position
		? records.filter(record => record.position === position)
		: records

	return scoped.slice(0, Math.max(1, limit))
}

const subscribeToasts = (listener: ToastListener) => {
	listeners.add(listener)
	return () => listeners.delete(listener)
}

const stringValue = (value: unknown) =>
	typeof value === 'string' ? value : undefined

const booleanValue = (value: unknown, fallback: boolean) =>
	typeof value === 'boolean' ? value : fallback

const hotkeyValue = (value: unknown) =>
	Array.isArray(value) && value.every(item => typeof item === 'string')
		? value
		: hotkeyDefault

const positions = new Set<ToastPosition>([
	'bottom-center',
	'bottom-left',
	'bottom-right',
	'top-center',
	'top-left',
	'top-right',
])

const positionValue = (value: unknown): ToastPosition =>
	typeof value === 'string' && positions.has(value as ToastPosition)
		? value as ToastPosition
		: 'bottom-right'

const composeClick = (
	previous: unknown,
	next: (() => void) | undefined,
) => (event: MouseEvent) => {
	callHandler(previous, event)
	next?.()
}

const resolveClass = (
	value: ToasterArgs['toastClass'],
	toast: ToastView,
) => typeof value === 'function' ? value(toast) : value

/** Add a generated toast and return controls for updating or dismissing it. */
export const toast = (
	input: ToastInput | unknown,
	options?: Omit<ToastInput, 'title'>,
): ToastController => {
	const data = normalize(input, options)
	const toastId = data.id ?? id('toast')
	const existing = records.find(record => record.id === toastId)
	const duration = data.duration ?? existing?.duration ?? configuredDuration
	const record: ToastRecord = {
		...existing,
		...data,
		id: toastId,
		duration,
		open: true,
		remaining: Math.max(0, duration),
		startedAt: 0,
		timeout: existing?.timeout ?? null,
		variant: data.variant ?? existing?.variant ?? 'default',
		position: data.position ?? existing?.position ?? configuredPosition,
	}

	if (existing) {
		clearTimer(existing)
		records = records.map(current => current.id === toastId ? record : current)
	} else {
		records = [record, ...records]
	}

	startTimer(record)
	emit()

	return {
		id: toastId,
		dismiss: () => dismissToast(toastId),
		update: patch => updateToast(toastId, patch),
	}
}

/** Update an existing generated toast. */
export const updateToast = (id: string, patch: ToastInput) => {
	const record = records.find(current => current.id === id)
	if (!record) return

	clearTimer(record)
	Object.assign(record, patch, {
		duration: patch.duration ?? record.duration,
		remaining: Math.max(0, patch.duration ?? record.duration ?? defaultDuration),
	})
	startTimer(record)
	emit()
}

/** Dismiss one generated toast, or every generated toast when no id is passed. */
export const dismissToast = (id?: string) => {
	const targets = id ? records.filter(record => record.id === id) : records

	for (const record of targets) {
		clearTimer(record)
		record.open = false
	}

	emit()

	if (!browser()) {
		records = id ? records.filter(record => record.id !== id) : []
		emit()
		return
	}

	for (const record of targets) {
		setTimeout(() => removeToast(record.id), closeDelay)
	}
}

/** Remove all generated toasts immediately. Useful for deterministic tests and stories. */
export const clearToasts = () => {
	for (const record of records) clearTimer(record)
	records = []
	emit()
}

/** Provider for toast defaults. */
const ToastProvider: Stateless<ToastProviderArgs> = ({
	children,
	duration = defaultDuration,
	label,
}) => {
	configuredDuration = duration
	configuredLabel = label
	return children
}

// Inline corner placement per position. The popupStyle reset zeroes the UA
// popover inset, and inline declarations are the only ones that can win over
// that reset, so the operative placement lives here; themed position classes
// agree with (and never fight) these values.
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
	popover = 'manual',
	position = 'bottom-right',
	style,
	tabIndex = -1,
	...attrs
}) => {
	const hotkeyText = hotkey.join('+')
	const title = label ?? configuredLabel ?? `Notifications (${hotkeyText})`

	return (
		<ol
			{...attrs}
			aria-atomic="false"
			aria-label={title}
			aria-live="polite"
			class={classes}
			data-hotkey={hotkeyText}
			data-position={position}
			data-slot="toast-viewport"
			popover={popover}
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
	open = true,
	role,
	type = 'foreground',
	variant = 'default',
	...attrs
}) => open ? (
	<li
		{...attrs}
		class={classes}
		data-slot="toast"
		data-state="open"
		data-type={type}
		data-variant={variant}
		role={role ?? (variant === 'danger' ? 'alert' : 'status')}
	>
		{children}
	</li>
) : null

/** Toast title slot. */
const ToastTitle: Stateless<ToastTitleArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={classes} data-slot="toast-title">
		{children}
	</div>
)

/** Toast description slot. */
const ToastDescription: Stateless<ToastDescriptionArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={classes} data-slot="toast-description">
		{children}
	</div>
)

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

/** Render generated toasts from the module-level toast store. */
const Toaster: Stateful<ToasterArgs> = function* ({
	hotkey = hotkeyDefault,
	limit = defaultLimit,
	pauseOnWindowBlur = true,
}) {
	let rootViewport: HTMLOListElement | null = null
	let portalViewport: HTMLOListElement | null = null
	let portalMount: HTMLElement | null = null
	let portalWatch: MutationObserver | null = null
	let renderPortal: ((items: ToastRecord[]) => void) | null = null
	const modals: HTMLDialogElement[] = []
	let toasts = visibleToasts(toNumber(limit, defaultLimit))
	let currentHotkey: string[] = hotkeyValue(hotkey)
	let currentPauseOnWindowBlur = booleanValue(pauseOnWindowBlur, true)
	let hovered = false
	const heights = new Map<string, number>()

	// While a modal dialog hosts the portal, the toasts live there: the
	// active viewport is wherever they currently render.
	const viewport = () => portalMount ? portalViewport : rootViewport

	const measure = () => {
		const host = viewport()
		if (!host) return
		const known = new Set(records.map(record => record.id))
		let changed = false
		for (const key of Array.from(heights.keys())) {
			if (!known.has(key)) heights.delete(key)
		}
		for (const element of Array.from(host.querySelectorAll<HTMLElement>('[data-slot="toast"]'))) {
			const id = element.dataset.toastId
			if (!id || !known.has(id)) continue
			const height = element.offsetHeight
			if (heights.get(id) !== height) {
				heights.set(id, height)
				changed = true
			}
		}
		if (changed) this.next()
	}

	// Viewport top-layer lifecycle: shown from mount onward, empty included.
	// The viewport is the polite live region, and screen readers only announce
	// content ADDED to a region that already exists in the accessibility tree —
	// a region that first appears together with its content stays silent, so
	// hiding while empty would swallow the first role=status toast of every
	// stack. A shown-but-empty viewport is harmless (pointer-events-none);
	// hide+show happens ONLY for the epoch re-promotion below.
	// openPopover/closePopover guard missing support, repeat calls, and
	// InvalidStateError.
	//
	// Modal nuance, verified against Chromium: "hide all popovers" only pops
	// the auto stack, so showModal() leaves a shown manual viewport open but
	// BELOW the later-promoted <dialog> (top-layer order is promotion order).
	// The epochs track modals promoted after our last show; hide+show in the
	// same task (no paint in between) moves the viewport back above. Gating
	// on the epoch keeps re-promotion to once per modal, so ordinary emits do
	// not flip display and replay the toasts' @starting-style enter
	// transitions.
	let topLayerEpoch = 0
	let promotedEpoch = 0

	const syncViewport = () => {
		if (!rootViewport?.isConnected) return
		if (promotedEpoch < topLayerEpoch) closePopover(rootViewport)
		openPopover(rootViewport)
		promotedEpoch = topLayerEpoch
	}

	const syncPortal = () => {
		if (portalViewport?.isConnected) openPopover(portalViewport)
	}

	// Foreign hides (an engine hiding popovers on showModal, or an outside
	// hidePopover call) re-show: the live region must stay present. Our own
	// hide only happens during epoch re-promotion, which reopens synchronously
	// before this microtask runs, so neither can loop. Deferred to a microtask
	// so the re-show lands after the hide settles. Tearing a portal viewport
	// down never lands here: removal-triggered popover hides fire no toggle.
	const onViewportToggle = (event: ToggleEvent) => {
		if (event.newState !== 'closed') return
		const target = event.currentTarget as HTMLOListElement
		queueMicrotask(() => {
			if (target === portalViewport) syncPortal()
			else if (target === rootViewport) syncViewport()
		})
	}

	const pauseStack = () => {
		for (const record of records) pauseRecord(record)
	}
	const resumeStack = () => {
		for (const record of records) resumeRecord(record)
	}

	// Portal root: while a modal dialog exposing a portal outlet is open, the
	// toasts render through a second ajo root inside the dialog subtree — the
	// only place the platform lets them stay interactive: everything outside
	// a modal is inert no matter how it stacks, so root-rendered toasts paint
	// above the dialog but never win a hit test (clicks fall through to the
	// backdrop and light-dismiss the dialog), and their live region is pruned
	// from the accessibility tree. The outlet carries `skip`, so the dialog's
	// own tree never reconciles the portal DOM. The root viewport meanwhile
	// stays shown-but-empty, keeping its polite live region alive for the
	// next root-rendered toast. Modals without an outlet (raw dialogs) keep
	// the old visible-but-inert behavior.
	const portalOutlet = (dialog: HTMLDialogElement) =>
		Array.from(dialog.querySelectorAll<HTMLElement>('[data-slot="dialog-portal"]'))
			.find(element => element.closest('dialog') === dialog) ?? null

	// Only the TOPMOST open modal decides: with stacked modals everything
	// below the top one is inert too, so falling through to a lower outlet
	// would trap the toasts inert and painted under the topmost backdrop.
	// A topmost modal without an outlet returns null — the toasts fall back
	// to the root viewport (visible-but-inert above the modal).
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
			portalWatch.observe(document.documentElement, { childList: true, subtree: true })
		} else if (!wanted && portalWatch) {
			portalWatch.disconnect()
			portalWatch = null
		}
	}

	const rehome = () => {
		const outlet = portalTarget()
		if (outlet !== (portalMount?.parentElement ?? null)) {
			if (portalMount) {
				render(null, portalMount)
				portalMount.remove()
				portalMount = null
				portalViewport = null
			}
			if (outlet) {
				portalMount = document.createElement('div')
				portalMount.style.display = 'contents'
				outlet.append(portalMount)
				// Two-phase mount: show the EMPTY portal region now so a
				// toast arriving in the upcoming render is an addition to an
				// existing live region — a region that first appears together
				// with its content stays silent.
				renderPortal?.([])
			}
			// The pointer's hover chain broke with the swap; resume and let
			// a fresh pointerenter on the new viewport re-pause.
			if (hovered) {
				hovered = false
				resumeStack()
			}
			this.next()
		}
		syncWatch()
	}

	// Modal dialogs fire toggle events on open and close; capture them
	// document-wide (toggle does not bubble). A modal opening AFTER the
	// viewport was shown re-promotes it, and a modal exposing a portal
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
	const unsubscribe = subscribeToasts(sync)
	this.signal.addEventListener('abort', () => {
		unsubscribe()
		portalWatch?.disconnect()
		portalWatch = null
		if (portalMount) {
			render(null, portalMount)
			portalMount.remove()
			portalMount = null
			portalViewport = null
		}
	}, { once: true })

	const focusViewport = (_event: KeyboardEvent) => viewport()?.focus()

	const pauseAll = () => {
		if (!currentPauseOnWindowBlur) return
		for (const record of records) pauseRecord(record)
	}
	const resumeAll = () => {
		if (!currentPauseOnWindowBlur) return
		for (const record of records) resumeRecord(record)
	}

	bindHotkey(this, {
		keys: () => currentHotkey.join('+'),
		active: () => toasts.length > 0,
		onPress: event => focusViewport(event),
	})

	if (browser()) {
		window.addEventListener('blur', pauseAll, { signal: this.signal })
		window.addEventListener('focus', resumeAll, { signal: this.signal })
		document.addEventListener('toggle', onTopLayerToggle, { capture: true, signal: this.signal })
		// Modals already open before this Toaster mounted never fire a toggle
		// we can see; seed them so the first render can portal into them.
		for (const dialog of Array.from(document.querySelectorAll<HTMLDialogElement>('dialog'))) {
			if (dialog.matches(':modal')) modals.push(dialog)
		}
	}

	for (const {
		actionWrapperClass,
		class: classes,
		closeButton = true,
		closeChildren,
		closeClass,
		contentClass,
		descriptionClass,
		duration = defaultDuration,
		expand = false,
		hotkey = hotkeyDefault,
		label,
		limit = defaultLimit,
		pauseOnWindowBlur = true,
		position = 'bottom-right',
		titleClass,
		toastClass,
		...attrs
	} of this) {
		const nextClass = stringValue(classes)
		const nextCloseButton = booleanValue(closeButton, true)
		const nextDuration = toNumber(duration, defaultDuration)
		const nextHotkey = hotkeyValue(hotkey)
		const nextLabel = stringValue(label) ?? configuredLabel
		const nextLimit = toNumber(limit, defaultLimit)
		const nextPauseOnWindowBlur = booleanValue(pauseOnWindowBlur, true)
		const nextPosition = positionValue(position)

		configuredDuration = nextDuration
		configuredPosition = nextPosition
		currentHotkey = nextHotkey
		currentPauseOnWindowBlur = nextPauseOnWindowBlur
		toasts = visibleToasts(nextLimit, nextPosition)

		// A toast fired while the pointer rests on the stack starts its timer
		// (pointerenter cannot re-fire under a stationary pointer); re-pause
		// here so the newcomer freezes with the rest. pauseRecord is idempotent.
		if (hovered) pauseStack()

		const bottom = nextPosition.startsWith('bottom')
		const lift = bottom ? -1 : 1
		const expanded = booleanValue(expand, false) || hovered
		const frontHeight = heights.get(toasts[0]?.id ?? '') ?? 0
		const openToasts = toasts.filter(item => item.open)
		const stackHeight = edgeInset + (expanded
			? openToasts.reduce((total, item) => total + (heights.get(item.id) ?? 0), 0) + Math.max(0, openToasts.length - 1) * stackGap
			: frontHeight)

		// One builder, two roots: the yielded tree renders the root viewport
		// (empty while a portal hosts the toasts), and the portal root renders
		// the same view inside the open modal's outlet.
		const view = (items: typeof toasts, portal: boolean) => (
			<ToastViewport
				{...attrs}
				class={nextClass}
				data-portal={portal ? 'true' : undefined}
				hotkey={nextHotkey}
				// A caller-passed id must not duplicate across the two
				// simultaneously mounted viewports; the root keeps it.
				id={portal ? undefined : attrs.id}
				label={nextLabel}
				position={nextPosition}
				ref={(element: HTMLOListElement | null) => {
					if (portal) portalViewport = element
					else rootViewport = element
				}}
				style={`--front-toast-height:${frontHeight}px;--toast-gap:${stackGap}px;height:${stackHeight}px`}
				set:ontoggle={onViewportToggle}
				set:onpointerenter={() => {
					if (hovered) return
					hovered = true
					pauseStack()
					this.next()
				}}
				set:onpointerleave={() => {
					if (!hovered) return
					hovered = false
					resumeStack()
					this.next()
				}}
			>
				{items.map((item, index) => {
					const depth = Math.min(index, 2)
					const offset = expanded
						? items.slice(0, index).reduce((total, prior) => prior.open ? total + (heights.get(prior.id) ?? 0) + stackGap : total, 0)
						: depth * 14

					return (
						<Toast
							class={clx(resolveClass(toastClass, item), item.class)}
							data-closing={item.open ? 'false' : 'true'}
							data-expanded={expanded ? 'true' : 'false'}
							data-front={index === 0 ? 'true' : 'false'}
							data-side={bottom ? 'bottom' : 'top'}
							data-toast-id={item.id}
							data-toast-index={index}
							key={item.id}
							role={item.role}
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
							type={item.type}
							variant={item.variant}
						>
							<div class={contentClass} data-slot="toast-content">
								{item.title == null ? null : <ToastTitle class={titleClass}>{item.title}</ToastTitle>}
								{item.description == null ? null : <ToastDescription class={descriptionClass}>{item.description}</ToastDescription>}
							</div>
							{item.action == null ? null : (
								<div class={actionWrapperClass} data-slot="toast-action-wrapper">
									{item.action}
								</div>
							)}
							{(item.closeButton ?? nextCloseButton) ? (
								<ToastClose class={closeClass} onClose={() => dismissToast(item.id)}>
									{closeChildren}
								</ToastClose>
							) : null}
						</Toast>
					)
				})}
			</ToastViewport>
		)

		renderPortal = items => {
			if (!portalMount?.isConnected) return
			render(view(items, true), portalMount)
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
				renderPortal?.(toasts)
			} else if (portalMount || (modals.length && portalTarget())) {
				rehome()
			}
			syncViewport()
			measure()
		})

		yield view(portalMount ? [] : toasts, false)
	}
}

Toaster.attrs = { 'data-slot': 'toaster' }

export {
	Toaster,
	Toast,
	ToastAction,
	ToastClose,
	ToastDescription,
	ToastProvider,
	ToastTitle,
	ToastViewport,
}
