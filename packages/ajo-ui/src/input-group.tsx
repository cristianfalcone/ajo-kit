import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import { callHandler } from 'ajo-cloves'

export type InputGroupAddonAlign =
	| 'block-end'
	| 'block-start'
	| 'inline-end'
	| 'inline-start'

export type InputGroupArgs = WithChildren<IntrinsicElements['div'] & {
	/** Mark all grouped controls as disabled. */
	disabled?: boolean
}>

export type InputGroupAddonArgs = WithChildren<IntrinsicElements['div'] & {
	/** Placement relative to the input control. */
	align?: InputGroupAddonAlign
}>

export type InputGroupButtonArgs = WithChildren<IntrinsicElements['button'] & {
	'data-size'?: string
}>

export type InputGroupTextArgs = WithChildren<IntrinsicElements['span']>

export type InputGroupInputArgs = IntrinsicElements['input'] & {
	'data-slot'?: unknown
}

export type InputGroupTextareaArgs = WithChildren<IntrinsicElements['textarea'] & {
	'data-slot'?: unknown
}>

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

const InputGroupText: Stateless<InputGroupTextArgs> = ({ children, ...attrs }) => (
	<span {...attrs} data-slot="input-group-text">{children}</span>
)

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
