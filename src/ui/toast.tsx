import type { Children, Stateless } from 'ajo'
import clsx from 'clsx'
import type { FixedArgs, OmitArg } from 'ajo-ui/utils'
import {
	Toaster as BaseToaster,
	Toast as BaseToast,
	ToastAction as BaseToastAction,
	ToastClose as BaseToastClose,
	ToastDescription as BaseToastDescription,
	ToastTitle as BaseToastTitle,
	ToastViewport as BaseToastViewport,
	clearToasts,
	dismissToast,
	toast as pushToast,
	updateToast,
	type ToasterArgs as BaseToasterArgs,
	type ToastView as BaseToastView,
	type ToastActionArgs,
	type ToastArgs,
	type ToastCloseArgs,
	type ToastController,
	type ToastDescriptionArgs,
	type ToastInput,
	type ToastPosition,
	type ToastTitleArgs,
	type ToastVariant,
	type ToastViewportArgs,
} from 'ajo-ui/toast'
export { ToastProvider } from 'ajo-ui/toast'
export type { ToastActionArgs, ToastArgs, ToastCloseArgs, ToastController, ToastDescriptionArgs, ToastInput, ToastPosition, ToastProviderArgs, ToastTitleArgs, ToastType, ToastVariant, ToastViewportArgs } from 'ajo-ui/toast'

export type ToastToasterArgs = OmitArg<BaseToasterArgs, 'actionWrapperClass' | 'class' | 'closeChildren' | 'closeClass' | 'contentClass' | 'descriptionClass' | 'position' | 'titleClass' | 'toastClass'> & FixedArgs<'actionWrapperClass' | 'closeChildren' | 'closeClass' | 'contentClass' | 'descriptionClass' | 'titleClass' | 'toastClass'> & {
	/** Additional UnoCSS classes. */
	class?: string
	/** Fixed screen position for generated toasts. */
	position?: ToastPosition
}
export type ToastKind =
	| 'default'
	| 'error'
	| 'info'
	| 'loading'
	| 'success'
	| 'warning'

export type ToastActionInput = {
	/** Action label shown inside the toast. */
	label: unknown
	/** Called when the action is selected. */
	onClick?: () => void
}

export type ToastOptions = Omit<ToastInput, 'action' | 'role' | 'title' | 'type' | 'variant'> & {
	/** Inline action object for generated toast calls. */
	action?: ToastActionInput | Children
	/** Force assertive live-region semantics. */
	important?: boolean
	/** Apply type-colored toast surfaces. */
	richColors?: boolean
}

export type ToastPromiseMessages<T = unknown> = {
	/** Message shown while the promise is pending. */
	loading: unknown
	/** Message or resolver used when the promise fulfills. */
	success: unknown | ((value: T) => unknown)
	/** Message or resolver used when the promise rejects. */
	error: unknown | ((error: unknown) => unknown)
	/** Optional description or resolver used for fulfilled/rejected states. */
	description?: unknown | ((value: T | unknown) => unknown)
}

export type ToasterArgs = {
	/** Additional UnoCSS classes applied to each toast viewport. */
	class?: string
	/** Show close buttons on generated toasts. */
	closeButton?: boolean
	/** Default auto-dismiss duration for generated toasts. */
	duration?: number
	/** Show every visible toast at full size instead of the compact toast stack. */
	expand?: boolean
	/** Keyboard shortcut shown in the accessible viewport label. */
	hotkey?: string[]
	/** Custom icons by toast kind. */
	icons?: Partial<Record<Exclude<ToastKind, 'default'>, Children>>
	/** Accessible label for generated toast viewports. */
	label?: string
	/** Pause generated toast timers while the window is blurred. */
	pauseOnWindowBlur?: boolean
	/** Fixed default position for generated toasts. */
	position?: ToastPosition
	/** Apply type-colored toast surfaces. */
	richColors?: boolean
	/** Defaults merged into every toast call. */
	toastOptions?: ToastOptions
	/** Maximum visible generated toasts per position. */
	visibleToasts?: number
}

export type ToastApi = {
	(message: unknown, options?: ToastOptions): ToastController
	clear: typeof clearToasts
	dismiss: typeof dismissToast
	error: (message: unknown, options?: ToastOptions) => ToastController
	info: (message: unknown, options?: ToastOptions) => ToastController
	loading: (message: unknown, options?: ToastOptions) => ToastController
	promise: <T>(
		promise: Promise<T> | (() => Promise<T>),
		messages: ToastPromiseMessages<T>,
		options?: ToastOptions,
	) => Promise<T>
	success: (message: unknown, options?: ToastOptions) => ToastController
	warning: (message: unknown, options?: ToastOptions) => ToastController
}

const rootBase = 'group/toast pointer-events-auto grid origin-top grid-cols-[1fr_auto] items-start gap-x-4 gap-y-1 rounded-lg edge p-4 pr-10 shadow-lg transition-[margin,opacity,transform,box-shadow] duration-200 ease-out motion-reduce:transition-none'
// Tonal variants replace the glass-overlay surface wholesale so each toast
// keeps a single bg/ring owner instead of stacking tints over the shortcut.
const rootVariants: Record<ToastVariant, string> = {
	default: 'glass-overlay',
	danger: 'bg-danger/10 text-danger inset-ring-danger/25 backdrop-blur-xl backdrop-saturate-150',
	info: 'bg-info/10 text-info inset-ring-info/25 backdrop-blur-xl backdrop-saturate-150',
	success: 'bg-success/10 text-success inset-ring-success/25 backdrop-blur-xl backdrop-saturate-150',
	warning: 'bg-warning/10 text-warning inset-ring-warning/25 backdrop-blur-xl backdrop-saturate-150',
}
// No z-index and no display utility: the viewport is a `popover="manual"`
// element, so the top layer owns stacking (a fixed z-100 loses to an open
// modal <dialog>) and the UA popover rule must keep it display:none while
// hidden. Corner placement classes mirror the base's inline viewportInsets —
// EXCEPT the centering shift: the base inlines `transform:translateX(-50%)`,
// and a `-translate-x-1/2` utility compiles to the separate `translate`
// property, so both would apply and shift the viewport a full extra half
// width off center.
const viewportBase = 'pointer-events-none fixed group/toast-viewport w-full p-4 outline-none sm:max-w-[420px]'
const viewportPositions: Record<ToastPosition, string> = {
	'bottom-center': 'bottom-0 left-1/2',
	'bottom-left': 'bottom-0 left-0',
	'bottom-right': 'bottom-0 right-0',
	'top-center': 'top-0 left-1/2',
	'top-left': 'top-0 left-0',
	'top-right': 'top-0 right-0',
}
const titleBase = 'text-sm font-semibold'
const descriptionBase = 'text-sm opacity-90'
const actionBase = 'inline-flex h-8 shrink-0 items-center justify-center rounded-md edge bg-transparent px-3 text-sm font-medium transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 group-data-[variant=danger]/toast:inset-ring-danger/40 group-data-[variant=danger]/toast:hover:bg-danger/10 group-data-[variant=danger]/toast:hover:text-danger'
const closeBase = 'absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-md text-foreground/60 opacity-70 outline-none transition-opacity hover:text-foreground hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none group-data-[variant=danger]/toast:text-danger/70 group-data-[variant=danger]/toast:hover:text-danger'
const contentBase = 'grid gap-1 transition-opacity duration-200 motion-reduce:transition-none'
const actionWrapperBase = 'col-start-2 row-span-2 row-start-1 self-center transition-opacity duration-200 motion-reduce:transition-none'
const toastPositions: ToastPosition[] = [
	'top-left',
	'top-center',
	'top-right',
	'bottom-left',
	'bottom-center',
	'bottom-right',
]
const defaultIcons: Record<Exclude<ToastKind, 'default'>, string> = {
	error: 'i-lucide-octagon-x text-danger',
	info: 'i-lucide-info text-info',
	loading: 'i-lucide-loader-2 animate-spin text-muted-foreground motion-reduce:animate-none',
	success: 'i-lucide-circle-check text-success',
	warning: 'i-lucide-triangle-alert text-warning',
}
let configuredDuration = 5000
let configuredPosition: ToastPosition = 'bottom-right'
let configuredRichColors = false
let configuredCloseButton = true
let configuredToastOptions: ToastOptions = {}
let configuredIcons: ToasterArgs['icons'] = {}

const toastClass = (item: BaseToastView) =>
	clsx(rootBase, rootVariants[item.variant ?? 'default'])

const resolve = <T,>(value: unknown | ((item: T) => unknown), item: T) =>
	typeof value === 'function'
		? (value as (item: T) => unknown)(item)
		: value

/** Toast viewport where generated or manually composed toasts are rendered. */
const ToastViewport: Stateless<ToastViewportArgs> = ({
	class: classes,
	position = 'bottom-right',
	...attrs
}) => (
	<BaseToastViewport
		{...attrs}
		class={clsx(viewportBase, viewportPositions[position], classes)}
		position={position}
	/>
)

/** Toast root for composed notifications. */
const Toast: Stateless<ToastArgs> = ({
	class: classes,
	variant = 'default',
	...attrs
}) => (
	<BaseToast
		{...attrs}
		class={clsx(rootBase, rootVariants[variant], classes)}
		variant={variant}
	/>
)

/** Toast title slot. */
const ToastTitle: Stateless<ToastTitleArgs> = ({ class: classes, ...attrs }) => (
	<BaseToastTitle {...attrs} class={clsx(titleBase, classes)} />
)

/** Toast description slot. */
const ToastDescription: Stateless<ToastDescriptionArgs> = ({ class: classes, ...attrs }) => (
	<BaseToastDescription {...attrs} class={clsx(descriptionBase, classes)} />
)

/** Toast action button. */
const ToastAction: Stateless<ToastActionArgs> = ({ class: classes, ...attrs }) => (
	<BaseToastAction {...attrs} class={clsx(actionBase, classes)} />
)

/** Toast close button. */
const ToastClose: Stateless<ToastCloseArgs> = ({ children, class: classes, ...attrs }) => (
	<BaseToastClose {...attrs} class={clsx(closeBase, classes)}>
		{children ?? <span aria-hidden="true" class="i-lucide-x block size-4" />}
	</BaseToastClose>
)

/** Render generated toasts for one position from the module-level toast store. */
const ToastToaster: Stateless<ToastToasterArgs> = ({
	class: classes,
	position = 'bottom-right',
	...attrs
}) => (
	<BaseToaster
		{...attrs}
		actionWrapperClass={actionWrapperBase}
		class={clsx(viewportBase, viewportPositions[position], classes)}
		closeChildren={<span aria-hidden="true" class="i-lucide-x block size-4" />}
		closeClass={closeBase}
		contentClass={contentBase}
		descriptionClass={descriptionBase}
		position={position}
		titleClass={titleBase}
		toastClass={toastClass}
	/>
)

const actionNode = (action: ToastOptions['action']) => {
	if (
		action &&
		typeof action === 'object' &&
		'label' in action
	) {
		const item = action as ToastActionInput
		return <ToastAction onAction={item.onClick}>{item.label}</ToastAction>
	}

	return action
}

const iconNode = (type: ToastKind) => {
	if (type === 'default') return null
	const custom = configuredIcons?.[type]
	if (custom) return custom

	return <span aria-hidden="true" class={`${defaultIcons[type]} size-4 shrink-0`} />
}

const titleNode = (type: ToastKind, message: unknown) => {
	const icon = iconNode(type)
	if (!icon) return message

	return (
		<span class="flex min-w-0 items-start gap-2">
			<span class="mt-0.5 inline-flex shrink-0" data-slot="toast-icon">{icon}</span>
			<span class="min-w-0">{message}</span>
		</span>
	)
}

const input = (
	type: ToastKind,
	message: unknown,
	options: ToastOptions = {},
): ToastInput => {
	const merged = { ...configuredToastOptions, ...options }
	const richColors = merged.richColors ?? configuredRichColors
	const variant = type === 'error'
		? 'danger'
		: richColors && (type === 'info' || type === 'success' || type === 'warning')
			? type
			: 'default'

	return {
		...merged,
		action: actionNode(merged.action),
		class: merged.class,
		closeButton: merged.closeButton ?? configuredCloseButton,
		description: merged.description,
		duration: type === 'loading' && merged.duration == null
			? 0
			: merged.duration ?? configuredDuration,
		position: merged.position ?? configuredPosition,
		role: merged.important || type === 'error' ? 'alert' : 'status',
		title: titleNode(type, message),
		variant,
	}
}

const send = (
	type: ToastKind,
	message: unknown,
	options?: ToastOptions,
) => pushToast(input(type, message, options))

const promise = <T,>(
	task: Promise<T> | (() => Promise<T>),
	messages: ToastPromiseMessages<T>,
	options?: ToastOptions,
) => {
	const controller = send('loading', messages.loading, { ...options, duration: 0 })
	const work = Promise.resolve().then(() => typeof task === 'function' ? task() : task)

	return work.then(value => {
		controller.update(input('success', resolve(messages.success, value), {
			...options,
			description: messages.description == null
				? options?.description
				: resolve(messages.description, value),
			duration: options?.duration ?? configuredDuration,
		}))
		return value
	}).catch(error => {
		controller.update(input('error', resolve(messages.error, error), {
			...options,
			description: messages.description == null
				? options?.description
				: resolve(messages.description, error),
			duration: options?.duration ?? configuredDuration,
		}))
		throw error
	})
}

const api = ((message: unknown, options?: ToastOptions) =>
	send('default', message, options)) as ToastApi

api.clear = clearToasts
api.dismiss = dismissToast
api.error = (message, options) => send('error', message, options)
api.info = (message, options) => send('info', message, options)
api.loading = (message, options) => send('loading', message, options)
api.promise = promise
api.success = (message, options) => send('success', message, options)
api.warning = (message, options) => send('warning', message, options)

/** Generated-toast controls. */
export const toast = api

/** Generated-toast renderer. */
const Toaster: Stateless<ToasterArgs> = ({
	class: classes,
	closeButton = true,
	duration = 5000,
	expand = false,
	hotkey,
	icons,
	label,
	pauseOnWindowBlur,
	position = 'bottom-right',
	richColors = false,
	toastOptions,
	visibleToasts = 3,
}) => {
	configuredDuration = duration
	configuredPosition = position
	configuredRichColors = richColors
	configuredCloseButton = closeButton
	configuredToastOptions = { ...(toastOptions ?? {}), position: toastOptions?.position ?? position }
	configuredIcons = icons ?? {}

	return (
		<div
			class="contents"
			data-slot="toaster"
		>
			{toastPositions.map(item => (
				<ToastToaster
					key={item}
					class={clsx('toaster group', classes)}
					closeButton={closeButton}
					duration={duration}
					expand={expand}
					hotkey={hotkey}
					label={label}
					limit={visibleToasts}
					pauseOnWindowBlur={pauseOnWindowBlur}
					position={item}
				/>
			))}
		</div>
	)
}

export {
	Toaster,
	Toast,
	ToastAction,
	ToastClose,
	ToastDescription,
	ToastToaster,
	ToastTitle,
	ToastViewport,
	clearToasts,
	dismissToast,
	updateToast,
}
