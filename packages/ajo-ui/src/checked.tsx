import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { callHandler, callRef } from 'ajo-cloves'
import { flag } from './shared'
import type { FixedArgs, OmitArg } from './utils'

/** Arguments shared by the native checkbox-backed controls. */
export type CheckedArgs = OmitArg<IntrinsicElements['input'], 'checked' | 'defaultChecked' | 'set:checked'> & {
	/** Controlled checked state, kept on the input's live `checked` property. */
	checked?: boolean
	/** Initial checked state for uncontrolled usage. */
	defaultChecked?: boolean
	/** Classes for the native input element. */
	inputClass?: string
	/** Called when the user changes the checked state. */
	onCheckedChange?: (checked: boolean, event: Event) => void
} & FixedArgs<'set:checked'>

type CheckedRootArgs = WithChildren<{
	checked?: boolean
	defaultChecked?: boolean
	inputAttrs: IntrinsicElements['input']
	inputClass?: string
	onCheckedChange?: CheckedArgs['onCheckedChange']
	slot: string
}>

const state = (checked: boolean | undefined, indeterminate: boolean | undefined) =>
	indeterminate ? 'indeterminate' : checked ? 'checked' : 'unchecked'

const CheckedRoot: Stateful<CheckedRootArgs, 'span'> = function* () {
	let input = null as HTMLInputElement | null
	let checked: boolean | undefined
	let indeterminate: boolean | undefined
	let onChange: unknown
	let onCheckedChange: CheckedArgs['onCheckedChange']

	const change = (event: Event) => {
		try {
			callHandler(onChange, event)
			onCheckedChange?.((event.currentTarget as HTMLInputElement).checked, event)
		} finally {
			// A controlled input shows only what its owner rendered, so a rejected change reverts.
			if (checked != null && input) {
				input.checked = checked
				input.indeterminate = Boolean(indeterminate)
			}
			this.next()
		}
	}

	for (const { children, defaultChecked, inputAttrs, inputClass, slot, ...args } of this) {
		const { ref, 'set:onchange': handler, ...attrs } = inputAttrs
		checked = args.checked
		indeterminate = attrs['set:indeterminate']
		onChange = handler
		onCheckedChange = args.onCheckedChange

		yield (
			<>
				<input
					{...attrs}
					{...(checked == null ? {} : { 'set:checked': checked })}
					checked={checked ?? defaultChecked}
					class={inputClass}
					data-slot={`${slot}-input`}
					ref={element => {
						input = element
						// Runs after this render's properties, so the host follows the live input in both modes.
						if (element) this.dataset.state = state(element.checked, element.indeterminate)
						callRef(ref, element)
					}}
					set:onchange={change}
					type="checkbox"
				/>
				{children}
			</>
		)
	}
}

CheckedRoot.is = 'span'

/**
 * One native checkbox root for Checkbox and Switch. `checked` is controlled and
 * re-asserted after every change, `defaultChecked` starts an uncontrolled input,
 * and the host carries `data-state` (checked, indeterminate or unchecked).
 */
export const Checked: Stateless<WithChildren<CheckedArgs & { slot: string }>> = ({
	checked,
	children,
	class: classes,
	defaultChecked,
	inputClass,
	onCheckedChange,
	slot,
	...attrs
}) => (
	<CheckedRoot
		checked={checked}
		defaultChecked={defaultChecked}
		inputAttrs={attrs}
		inputClass={inputClass}
		onCheckedChange={onCheckedChange}
		slot={slot}
		attr:class={classes}
		attr:data-disabled={flag(attrs.disabled)}
		attr:data-slot={attrs['data-slot'] ?? slot}
		attr:data-state={state(checked ?? defaultChecked, attrs['set:indeterminate'])}
	>
		{children}
	</CheckedRoot>
)
