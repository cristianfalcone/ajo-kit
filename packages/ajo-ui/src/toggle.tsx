import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import type { OmitArg } from './utils'
import { callHandler, controlled, dom, listen } from 'ajo-cloves'
import { rootAttrs } from './shared'

/** Props for a controlled or uncontrolled two-state toggle button. */
export type ToggleArgs = OmitArg<IntrinsicElements['button'], 'children'> & WithChildren<{
	/** Controlled pressed state. */
	pressed?: boolean
	/** Initial pressed state for uncontrolled usage. */
	defaultPressed?: boolean
	/** Called when the pressed state changes. */
	onPressedChange?: (pressed: boolean, event: Event) => void
}>

type ToggleRootArgs = ToggleArgs & { onClick?: unknown }

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

	listen(this, 'click', (event: MouseEvent) => {
		callHandler(onClick, event)
		if (event.defaultPrevented || disabled) return

		state.set(!state.value, event)
	})

	for (const args of this) {
		disabled = Boolean(args.disabled)
		onClick = args.onClick
		onPressedChange = args.onPressedChange
		state.sync(args.pressed != null ? Boolean(args.pressed) : undefined)

		if (dom(this)) {
			this.dataset.state = stateAttribute(state.value)
			this.setAttribute('aria-pressed', pressedAttribute(state.value))
		}

		yield <>{args.children}</>
	}
}

ToggleRoot.is = 'button'

/** Unstyled two-state button using aria-pressed. */
const Toggle: Stateless<ToggleArgs> = ({
	'data-slot': slot = 'toggle',
	type = 'button',
	'set:onclick': onClick,
	...args
}) => {
	const pressed = Boolean(args.pressed ?? args.defaultPressed)

	return (
		<ToggleRoot
			{...rootAttrs(args, ['defaultPressed', 'disabled', 'onPressedChange', 'pressed'])}
			onClick={onClick}
			attr:aria-pressed={pressedAttribute(pressed)}
			attr:data-state={stateAttribute(pressed)}
			attr:data-slot={slot}
			attr:disabled={args.disabled || undefined}
			attr:type={type}
		/>
	)
}

export { Toggle }
