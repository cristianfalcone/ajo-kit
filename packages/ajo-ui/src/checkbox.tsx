import type { IntrinsicElements, Stateful, Stateless } from 'ajo'
import { callHandler, callRef, dom } from 'ajo-cloves'
import { flag } from './shared'
import { bool } from './utils'

/** Visual and ARIA state exposed by a Checkbox and shared by native checked controls. */
export type CheckboxState = 'checked' | 'indeterminate' | 'unchecked'

/** Maps a checked-state token to the native aria-checked vocabulary. */
export const ariaChecked = (state: CheckboxState) =>
	state === 'indeterminate' ? 'mixed' : state === 'checked' ? 'true' : 'false'

/** Mirrors a native input's live checked state onto it and one visual companion. */
export const syncCheckedState = (input: HTMLInputElement, companion?: HTMLElement | null): CheckboxState => {
	const state = input.type === 'checkbox' && input.indeterminate
		? 'indeterminate'
		: input.checked ? 'checked' : 'unchecked'
	input.dataset.state = state
	input.setAttribute('aria-checked', ariaChecked(state))
	if (companion) companion.dataset.state = state
	return state
}

/** Arguments for the native checkbox and its visual companion. */
export type CheckboxArgs = IntrinsicElements['input'] & {
	/** Classes for the checked indicator element. */
	checkedIndicatorClass?: string
	/** Classes for the native input element. */
	inputClass?: string
	/** Classes for the indeterminate indicator element. */
	indeterminateIndicatorClass?: string
	/** Called when the native checkbox state changes. */
	onCheckedChange?: (checked: boolean, event: Event) => void
}

type CheckboxRootArgs = {
	checkedIndicatorClass?: string
	inputAttrs: IntrinsicElements['input']
	inputClass?: string
	indeterminateIndicatorClass?: string
	onCheckedChange?: CheckboxArgs['onCheckedChange']
}

const stateFromAttrs = (attrs: IntrinsicElements['input']): CheckboxState => {
	if (bool(attrs['set:indeterminate'])) return 'indeterminate'
	return bool(attrs['set:checked'] ?? attrs.checked ?? attrs.defaultChecked) ? 'checked' : 'unchecked'
}

const CheckboxRoot: Stateful<CheckboxRootArgs, 'span'> = function* () {
	let input: HTMLInputElement | null = null

	const sync = () => {
		if (input) syncCheckedState(input, dom(this) ? this : null)
	}

	for (const {
		checkedIndicatorClass,
		inputAttrs,
		inputClass,
		indeterminateIndicatorClass,
		onCheckedChange,
	} of this) {
		const {
			class: _class,
			ref,
			'set:onchange': onChange,
			'set:oninput': onInput,
			type: _type,
			...attrs
		} = inputAttrs
		const state = stateFromAttrs(inputAttrs)

		if (dom(this)) this.dataset.state = state

		yield (
			<>
				<input
					{...attrs}
					aria-checked={ariaChecked(state)}
					class={inputClass}
					data-slot="checkbox-input"
					data-state={state}
					ref={element => {
						input = element
						callRef(ref, element)
						if (element) queueMicrotask(sync)
					}}
					set:onchange={(event: Event) => {
						callHandler(onChange, event)
						sync()
						onCheckedChange?.((event.currentTarget as HTMLInputElement).checked, event)
					}}
					set:oninput={(event: Event) => {
						callHandler(onInput, event)
						sync()
					}}
					type="checkbox"
				/>
				<span
					aria-hidden="true"
					class={checkedIndicatorClass}
					data-slot="checkbox-indicator"
					data-state="checked"
				/>
				<span
					aria-hidden="true"
					class={indeterminateIndicatorClass}
					data-slot="checkbox-indicator"
					data-state="indeterminate"
				/>
			</>
		)
	}
}

CheckboxRoot.is = 'span'

/** Unstyled native checkbox with state slots and form behavior. */
const Checkbox: Stateless<CheckboxArgs> = ({
	checkedIndicatorClass,
	class: classes,
	disabled,
	inputClass,
	indeterminateIndicatorClass,
	onCheckedChange,
	...attrs
}) => {
	const inputAttrs = { ...attrs, disabled }
	const state = stateFromAttrs(inputAttrs)

	return (
		<CheckboxRoot
			checkedIndicatorClass={checkedIndicatorClass}
			inputAttrs={inputAttrs}
			inputClass={inputClass}
			indeterminateIndicatorClass={indeterminateIndicatorClass}
			onCheckedChange={onCheckedChange}
			attr:class={classes}
			attr:data-disabled={flag(disabled)}
			attr:data-slot={attrs['data-slot'] ?? 'checkbox'}
			attr:data-state={state}
		/>
	)
}

export { Checkbox }
