import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import { callHandler } from 'ajo-cloves'

/** Logical edge occupied by an InputGroup addon. */
export type InputGroupAddonAlign =
	| 'block-end'
	| 'block-start'
	| 'inline-end'
	| 'inline-start'

/** Arguments for a host that groups one control with addons and actions. */
export type InputGroupArgs = WithChildren<IntrinsicElements['div'] & {
	/** Mark all grouped controls as disabled. */
	disabled?: boolean
}>

/** Arguments for content placed along an InputGroup edge. */
export type InputGroupAddonArgs = WithChildren<IntrinsicElements['div'] & {
	/** Placement relative to the input control. */
	align?: InputGroupAddonAlign
}>

/** Arguments for a button rendered inside an InputGroup. */
export type InputGroupButtonArgs = WithChildren<IntrinsicElements['button'] & {
	'data-size'?: string
}>

/** Arguments for non-interactive text rendered inside an InputGroup. */
export type InputGroupTextArgs = WithChildren<IntrinsicElements['span']>

/** Arguments for the native input control owned by an InputGroup. */
export type InputGroupInputArgs = IntrinsicElements['input'] & {
	'data-slot'?: unknown
}

/** Arguments for the native textarea control owned by an InputGroup. */
export type InputGroupTextareaArgs = WithChildren<IntrinsicElements['textarea'] & {
	'data-slot'?: unknown
}>

/** Unstyled host that groups a control with addons and actions. */
const InputGroup: Stateless<InputGroupArgs> = ({
	children,
	disabled,
	role = 'group',
	...attrs
}) => (
	<div
		{...attrs}
		data-disabled={disabled ? 'true' : undefined}
		data-slot="input-group"
		role={role}
	>
		{children}
	</div>
)

/** Unstyled addon that forwards non-button clicks to the grouped control. */
const InputGroupAddon: Stateless<InputGroupAddonArgs> = ({
	align = 'inline-start',
	children,
	role = 'group',
	'set:onclick': onclick,
	...attrs
}) => (
	<div
		{...attrs}
		data-align={align}
		data-slot="input-group-addon"
		role={role}
		set:onclick={(event: MouseEvent) => {
			callHandler(onclick, event)
			const target = event.target as HTMLElement
			if (target.closest('button')) return
			// The control slot wins over document order: a hidden form input
			// rendered before it must never swallow the forwarded focus.
			const parent = (event.currentTarget as HTMLElement).parentElement
			;(parent?.querySelector<HTMLElement>('[data-slot="input-group-control"]')
				?? parent?.querySelector<HTMLElement>('input,textarea'))
				?.focus()
		}}
	>
		{children}
	</div>
)

/** Unstyled button rendered inside an InputGroup. */
const InputGroupButton: Stateless<InputGroupButtonArgs> = ({
	children,
	'data-slot': slot = 'input-group-button',
	type = 'button',
	...attrs
}) => (
	<button
		{...attrs}
		data-slot={slot}
		type={type}
	>
		{children}
	</button>
)

/** Unstyled supporting text rendered inside an InputGroup. */
const InputGroupText: Stateless<InputGroupTextArgs> = ({ children, ...attrs }) => (
	<span {...attrs} data-slot="input-group-text">{children}</span>
)

/** Unstyled native input carrying the InputGroup control slot. */
const InputGroupInput: Stateless<InputGroupInputArgs> = ({
	'data-slot': slot = 'input-group-control',
	type = 'text',
	...attrs
}) => (
	<input
		{...attrs}
		data-slot={slot}
		type={type}
	/>
)

/** Unstyled native textarea carrying the InputGroup control slot. */
const InputGroupTextarea: Stateless<InputGroupTextareaArgs> = ({
	children,
	'data-slot': slot = 'input-group-control',
	...attrs
}) => (
	<textarea
		{...attrs}
		data-slot={slot}
	>
		{children}
	</textarea>
)

export {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
	InputGroupTextarea,
}
