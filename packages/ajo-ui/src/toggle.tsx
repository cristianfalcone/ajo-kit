import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import type { OmitArg } from './utils'
import { callHandler, controlled, dom, statefulRootAttrs as rootAttrs } from 'ajo-cloves'

export type ToggleArgs = OmitArg<IntrinsicElements['button'], 'children'> & WithChildren<{
	/** Controlled pressed state. */
	pressed?: boolean
	/** Initial pressed state for uncontrolled usage. */
	defaultPressed?: boolean
	/** Called when the pressed state changes. */
	onPressedChange?: (pressed: boolean, event: Event) => void
}>

type ToggleRootArgs = WithChildren<{
	defaultPressed?: boolean
	disabled?: boolean
	onClick?: unknown
	onPressedChange?: ToggleArgs['onPressedChange']
	pressed?: boolean
}>

const pressedAttribute = (pressed: boolean) => pressed ? 'true' : 'false'
const stateAttribute = (pressed: boolean) => pressed ? 'on' : 'off'

const ToggleRoot: Stateful<ToggleRootArgs, 'button'> = function* ({ defaultPressed, pressed }) {
	let disabled = false
	let onClick: unknown
	let onPressedChange: ToggleArgs['onPressedChange']
	const state = controlled<boolean>(this, {
		fallback: Boolean(pressed ?? defaultPressed),
		onChange: (next, event) => onPressedChange?.(next, event!),
	})

	for (const args of this) {
		disabled = Boolean(args.disabled)
		onClick = args.onClick
		onPressedChange = args.onPressedChange
		state.sync(args.pressed != null ? Boolean(args.pressed) : undefined)

		if (dom(this)) {
			this.dataset.state = stateAttribute(state.value)
			this.setAttribute('aria-pressed', pressedAttribute(state.value))
			this.onclick = event => {
				callHandler(onClick, event)
				if (event.defaultPrevented || disabled) return

				state.set(!state.value, event)
			}
		}

		yield <>{args.children}</>
	}
}

ToggleRoot.is = 'button'

/** Unstyled two-state button using aria-pressed. */
const Toggle: Stateless<ToggleArgs> = ({
	children,
	defaultPressed,
	disabled,
	onPressedChange,
	pressed,
	type = 'button',
	'set:onclick': onClick,
	...attrs
}) => {
	const state = stateAttribute(Boolean(pressed ?? defaultPressed))
	const disabledFlag = Boolean(disabled)

	return (
		<ToggleRoot
			{...rootAttrs(attrs)}
			defaultPressed={defaultPressed}
			disabled={disabledFlag}
			onClick={onClick}
			onPressedChange={onPressedChange}
			pressed={pressed}
			attr:aria-pressed={pressedAttribute(state === 'on')}
			attr:data-state={state}
			attr:data-slot={attrs['data-slot'] ?? 'toggle'}
			attr:disabled={disabledFlag || undefined}
			attr:type={type}
		>
			{children}
		</ToggleRoot>
	)
}

export { Toggle }
