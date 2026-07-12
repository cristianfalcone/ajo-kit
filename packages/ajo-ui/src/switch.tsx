import type { IntrinsicElements, Stateful, Stateless } from 'ajo'
import { callHandler, controlled } from 'ajo-cloves'

export type SwitchArgs = IntrinsicElements['input'] & {
	/** Controlled checked state. */
	checked?: boolean
	/** Initial checked state for uncontrolled usage. */
	defaultChecked?: boolean
	/** Called when the native checkbox state changes. */
	onCheckedChange?: (checked: boolean, event: Event) => void
	/** Classes for the hidden input element. */
	inputClass?: string
	/** Size marker mirrored as `data-size`. */
	size?: string
	/** Classes for the thumb element. */
	thumbClass?: string
}

type SwitchRootArgs = {
	checked?: boolean
	defaultChecked?: boolean
	inputAttrs: Record<string, unknown>
	inputClass?: string
	onCheckedChange?: SwitchArgs['onCheckedChange']
	role: unknown
	setChecked?: unknown
	setOnChange?: unknown
	size?: string
	thumbClass?: string
	value: unknown
}

const SwitchRoot: Stateful<SwitchRootArgs, 'span'> = function* ({ checked, defaultChecked, setChecked }) {
	let onCheckedChange: SwitchArgs['onCheckedChange']
	const state = controlled<boolean>(this, {
		fallback: Boolean(checked ?? defaultChecked ?? setChecked),
		onChange: (next, event) => onCheckedChange?.(next, event as Event),
	})

	for (const args of this) {
		const initialChecked = args.checked ?? args.defaultChecked
		onCheckedChange = args.onCheckedChange
		state.sync(args.checked != null ? Boolean(args.checked) : undefined)

		yield (
			<>
				<input
					{...args.inputAttrs}
					checked={initialChecked}
					class={args.inputClass}
					data-slot="switch-input"
					role={args.role as string | undefined}
					set:checked={state.value}
					set:onchange={(event: Event) => {
						callHandler(args.setOnChange, event)
						state.set((event.currentTarget as HTMLInputElement).checked, event)
					}}
					type="checkbox"
					value={args.value}
				/>
				<span aria-hidden="true" class={args.thumbClass} data-slot="switch-thumb" />
			</>
		)
	}
}

SwitchRoot.is = 'span'

/** Unstyled native switch control with form behavior. */
const Switch: Stateless<SwitchArgs> = ({
	checked,
	class: classes,
	defaultChecked,
	inputClass,
	onCheckedChange,
	role = 'switch',
	size,
	thumbClass,
	'set:checked': setChecked,
	'set:onchange': setOnChange,
	type: _type,
	value = 'on',
	...attrs
}) => (
	<SwitchRoot
		checked={checked}
		defaultChecked={defaultChecked}
		inputAttrs={attrs}
		inputClass={inputClass}
		onCheckedChange={onCheckedChange}
		role={role}
		setChecked={setChecked}
		setOnChange={setOnChange}
		size={size}
		thumbClass={thumbClass}
		value={value}
		attr:class={classes}
		attr:data-size={size}
		attr:data-slot="switch"
	/>
)

export { Switch }
