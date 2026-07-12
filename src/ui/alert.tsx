import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'

export type AlertVariant =
	| 'default'
	| 'danger'
	| 'info'
	| 'success'
	| 'warning'

export type AlertArgs = WithChildren<IntrinsicElements['div'] & {
	/** Visual alert tone. */
	variant?: AlertVariant
	/** Additional UnoCSS classes. */
	class?: string
}>

export type AlertTitleArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type AlertDescriptionArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type AlertActionArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

type AlertVariantOptions = {
	class?: string
	variant?: AlertVariant
}

// Alerts live in the content layer, often inside glass cards, so the surface
// is a plain tint: translucent color without its own backdrop-filter.
const base = 'relative grid w-full grid-cols-[0_1fr_auto] items-start gap-y-0.5 rounded-lg edge px-4 py-3 text-sm has-[>svg]:grid-cols-[1rem_1fr_auto] has-[>svg]:gap-x-3 has-[>[data-slot=alert-icon]]:grid-cols-[1rem_1fr_auto] has-[>[data-slot=alert-icon]]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current [&>[data-slot=alert-icon]]:size-4 [&>[data-slot=alert-icon]]:translate-y-0.5 [&>[data-slot=alert-icon]]:text-current'

const variants: Record<AlertVariant, string> = {
	default: 'bg-card/80 text-card-foreground shadow-xs',
	danger: 'bg-danger/10 text-danger inset-ring-danger/25 [&_[data-slot=alert-description]]:text-danger/85',
	success: 'bg-success/10 text-success inset-ring-success/25 [&_[data-slot=alert-description]]:text-success/85',
	warning: 'bg-warning/10 text-warning inset-ring-warning/25 [&_[data-slot=alert-description]]:text-warning/85',
	info: 'bg-info/10 text-info inset-ring-info/25 [&_[data-slot=alert-description]]:text-info/85',
}

/** Returns the UnoCSS class list for an alert variant. */
export const alertVariants = ({
	class: classes,
	variant = 'default',
}: AlertVariantOptions = {}) => clsx(base, variants[variant], classes)

/** Callout for important user attention. */
const Alert: Stateless<AlertArgs> = ({
	class: classes,
	children,
	role = 'alert',
	variant = 'default',
	...attrs
}) => (
	<div
		{...attrs}
		class={alertVariants({ class: classes, variant })}
		data-slot="alert"
		data-variant={variant}
		role={role}
	>
		{children}
	</div>
)

/** Title slot for `Alert`. */
const AlertTitle: Stateless<AlertTitleArgs> = ({
	class: classes,
	children,
	...attrs
}) => (
	<div
		{...attrs}
		class={clsx('col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight', classes)}
		data-slot="alert-title"
	>
		{children}
	</div>
)

/** Description/content slot for `Alert`. */
const AlertDescription: Stateless<AlertDescriptionArgs> = ({
	class: classes,
	children,
	...attrs
}) => (
	<div
		{...attrs}
		class={clsx('col-start-2 grid justify-items-start gap-1 text-sm text-muted-foreground [&_p]:leading-relaxed', classes)}
		data-slot="alert-description"
	>
		{children}
	</div>
)

/** Action slot for `Alert`, aligned to the end on wider screens. */
const AlertAction: Stateless<AlertActionArgs> = ({
	class: classes,
	children,
	...attrs
}) => (
	<div
		{...attrs}
		class={clsx('col-start-2 mt-3 flex flex-wrap gap-2 sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:mt-0 sm:justify-self-end sm:ps-3', classes)}
		data-slot="alert-action"
	>
		{children}
	</div>
)

export { Alert, AlertAction, AlertDescription, AlertTitle }
export default Alert
