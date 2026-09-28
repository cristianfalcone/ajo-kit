import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import { clx, part } from 'ajo-ui/utils'

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

export type AlertDescriptionArgs = AlertTitleArgs

export type AlertActionArgs = AlertTitleArgs

// Alerts sit on enamel like cards. The tone marks only the icon and the
// title; the description stays in the text colour, readable on any surface.
const base = 'relative grid w-full grid-cols-[0_1fr_auto] items-start gap-y-1 rounded-lg panel px-4 py-3 text-sm has-[>svg]:grid-cols-[1rem_1fr_auto] has-[>svg]:gap-x-3 has-[>[data-slot=alert-icon]]:grid-cols-[1rem_1fr_auto] has-[>[data-slot=alert-icon]]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:[color:var(--alert-tone,currentColor)] [&>[data-slot=alert-icon]]:size-4 [&>[data-slot=alert-icon]]:translate-y-0.5 [&>[data-slot=alert-icon]]:[color:var(--alert-tone,currentColor)]'

const variants: Record<AlertVariant, string> = {
	default: '',
	danger: '[--alert-tone:var(--danger)]',
	success: '[--alert-tone:var(--success)]',
	warning: '[--alert-tone:var(--warning)]',
	info: '[--alert-tone:var(--info)]',
}

/** Callout for important user attention. */
const Alert: Stateless<AlertArgs> = ({
	class: classes,
	role = 'alert',
	variant = 'default',
	...attrs
}) => (
	<div
		{...attrs}
		class={clx(base, variants[variant], classes)}
		data-slot="alert"
		data-variant={variant}
		role={role}
	/>
)

/** Title slot for `Alert`. */
const AlertTitle = part<AlertTitleArgs>('div', 'alert-title', { class: 'col-start-2 line-clamp-1 font-medium [color:var(--alert-tone,currentColor)]' })

/** Description/content slot for `Alert`. */
const AlertDescription = part<AlertDescriptionArgs>('div', 'alert-description', { class: 'col-start-2 grid justify-items-start gap-1 text-pretty' })

/** Action slot for `Alert`, aligned to the end on wider screens. */
const AlertAction = part<AlertActionArgs>('div', 'alert-action', { class: 'col-start-2 mt-3 flex flex-wrap gap-2 sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:mt-0 sm:justify-self-end sm:ps-3' })

export { Alert, AlertAction, AlertDescription, AlertTitle }
