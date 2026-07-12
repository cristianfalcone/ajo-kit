import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { callHandler, callRef, clamp, controlled, dom } from 'ajo-cloves'
import { context } from 'ajo/context'
import type { FixedArgs, OmitArg } from './utils'

/** Built-in InputOTP pattern accepting one or more ASCII digits. */
export const REGEXP_ONLY_DIGITS = /^[0-9]+$/
/** Built-in InputOTP pattern accepting one or more ASCII letters or digits. */
export const REGEXP_ONLY_DIGITS_AND_CHARS = /^[a-zA-Z0-9]+$/

export type InputOTPArgs = WithChildren<OmitArg<IntrinsicElements['input'], 'children' | 'defaultValue' | 'maxLength' | 'onChange' | 'pattern' | 'value'> & {
	/** Initial uncontrolled value. */
	defaultValue?: string
	/** Classes for the hidden native input. */
	inputClass?: string
	/** Maximum accepted characters. */
	maxLength?: number
	/** Called when the OTP value changes. */
	onValueChange?: (value: string, event?: Event) => void
	/** Called when the OTP reaches `maxLength`. */
	onComplete?: (value: string, event?: Event) => void
	/** Accepted character pattern. */
	pattern?: RegExp | string
	/** Controlled value. */
	value?: string
}> & FixedArgs<'onChange'>

export type InputOTPGroupArgs = WithChildren<IntrinsicElements['div']>

export type InputOTPSlotArgs = WithChildren<IntrinsicElements['div'] & {
	/** Classes for the caret wrapper element. */
	caretClass?: string
	/** Classes for the caret mark element. */
	caretMarkClass?: string
	/** Slot index in the OTP value. */
	index: number
}>

export type InputOTPSeparatorArgs = WithChildren<IntrinsicElements['div']>

type InputOTPContextValue = {
	active: number
	disabled: boolean
	focus: (index: number) => void
	maxLength: number
	value: string
}

const InputOTPContext = context<InputOTPContextValue | null>(null)

const isRegExp = (value: unknown): value is RegExp =>
	Object.prototype.toString.call(value) === '[object RegExp]'

const accepts = (pattern: RegExp | string | undefined, char: string) => {
	if (!pattern) return true
	if (isRegExp(pattern)) {
		pattern.lastIndex = 0
		return pattern.test(char)
	}
	return new RegExp(pattern).test(char)
}

const clean = (value: unknown, maxLength: number, pattern?: RegExp | string) =>
	String(value ?? '')
		.split('')
		.filter(char => accepts(pattern, char))
		.slice(0, Math.max(1, maxLength))
		.join('')

const inputPattern = (pattern: RegExp | string | undefined) =>
	isRegExp(pattern) ? pattern.source : pattern

const nextSelection = (input: HTMLInputElement | null, fallback: number) =>
	Math.min(input?.selectionStart ?? fallback, Math.max(0, input?.value.length ?? fallback))

const completionState = (value: string, maxLength: number) =>
	value.length === maxLength ? 'complete' : 'incomplete'

// The runtime routes `ref` on a stateful component to its host, so the
// wrapper forwards the consumer's input ref under a plain args key.
type InputOTPRootArgs = OmitArg<InputOTPArgs, 'ref'> & {
	inputRef?: InputOTPArgs['ref']
} & FixedArgs<'ref'>

const InputOTPRoot: Stateful<InputOTPRootArgs> = function* ({
	defaultValue = '',
	maxLength = 6,
	pattern,
	value,
}) {
	let input: HTMLInputElement | null = null
	const initial = clean(value ?? defaultValue, maxLength, pattern)
	let active = Math.min(initial.length, Math.max(0, maxLength - 1))
	let onValueChange: InputOTPArgs['onValueChange']
	let onComplete: InputOTPArgs['onComplete']
	let previousComplete = initial.length === maxLength ? initial : ''

	const emit = (next: string, event?: Event) => {
		onValueChange?.(next, event)
		if (next.length === maxLength && next !== previousComplete) {
			previousComplete = next
			onComplete?.(next, event)
		} else if (next.length !== maxLength) {
			previousComplete = ''
		}
	}
	const state = controlled<string>(this, {
		fallback: initial,
		onChange: (next, event) => emit(next, event),
	})

	const setValue = (
		next: string,
		args: InputOTPRootArgs,
		nextActive = next.length,
		event?: Event,
	) => {
		const length = args.maxLength ?? maxLength
		const parsed = clean(next, length, args.pattern)
		active = Math.min(nextActive, Math.max(0, length - 1))
		if (input) input.value = parsed
		state.accept(parsed, event)
	}

	const focus = (index: number) => {
		active = clamp(index, 0, Math.max(0, maxLength - 1))
		input?.focus()
		input?.setSelectionRange(active, active)
		this.next()
	}

	for (const args of this) {
		const {
			children,
			class: _class,
			defaultValue: _defaultValue,
			inputClass,
			inputRef,
			maxLength: _maxLength,
			onValueChange: change,
			onComplete: complete,
			pattern,
			value,
			'set:onblur': onBlur,
			'set:onfocus': onFocus,
			'set:oninput': onInput,
			'set:onkeyup': onKeyUp,
			'set:onpaste': onPaste,
			...inputAttrs
		} = args

		maxLength = _maxLength ?? 6
		onValueChange = change
		onComplete = complete
		state.sync(value != null ? clean(value, maxLength, pattern) : undefined)
		if (!state.controlled) {
			const parsed = clean(state.value, maxLength, pattern)
			if (parsed !== state.value) state.init(parsed)
		}
		active = Math.min(active, Math.max(0, maxLength - 1))
		if (dom(this)) this.dataset.state = completionState(state.value, maxLength)

		InputOTPContext({
			active,
			disabled: Boolean(inputAttrs.disabled),
			focus,
			maxLength,
			value: state.value,
		})

		yield (
			<>
				<input
					{...inputAttrs}
					aria-label={inputAttrs['aria-label'] ?? 'One-time password'}
					autocomplete={inputAttrs.autocomplete ?? 'one-time-code'}
					class={inputClass}
					data-slot="input-otp-input"
					data-state={completionState(state.value, maxLength)}
					inputmode={inputAttrs.inputmode ?? 'numeric'}
					maxLength={maxLength}
					pattern={inputPattern(pattern)}
					ref={element => {
						input = element
						callRef(inputRef, element)
					}}
					type={inputAttrs.type ?? 'text'}
					set:onblur={(event: FocusEvent) => {
						callHandler(onBlur, event)
						this.next(() => active = -1)
					}}
					set:onfocus={(event: FocusEvent) => {
						callHandler(onFocus, event)
						this.next(() => active = Math.min(state.value.length, Math.max(0, maxLength - 1)))
					}}
					set:oninput={(event: Event) => {
						callHandler(onInput, event)
						const control = event.currentTarget as HTMLInputElement
						setValue(control.value, args, nextSelection(control, control.value.length), event)
					}}
					set:onkeyup={(event: KeyboardEvent) => {
						callHandler(onKeyUp, event)
						this.next(() => {
							active = nextSelection(event.currentTarget as HTMLInputElement, active)
						})
					}}
					set:onpaste={(event: ClipboardEvent) => {
						callHandler(onPaste, event)
						if (event.defaultPrevented) return
						const pasted = event.clipboardData?.getData('text') ?? ''
						if (!pasted) return
						event.preventDefault()
						setValue(pasted, args, pasted.length, event)
					}}
					set:value={state.value}
				/>
				{children}
			</>
		)
	}
}


/** Unstyled one-time password input with visible slot context. */
const InputOTP: Stateless<InputOTPArgs> = ({
	children,
	class: classes,
	disabled,
	ref,
	...attrs
}) => {
	const maxLength = attrs.maxLength ?? 6
	const state = completionState(clean(attrs.value ?? attrs.defaultValue, maxLength, attrs.pattern), maxLength)

	return (
		<InputOTPRoot
			{...attrs}
			disabled={disabled}
			inputRef={ref}
			attr:class={classes}
			attr:data-disabled={disabled ? 'true' : undefined}
			attr:data-slot="input-otp"
			attr:data-state={state}
		>
			{children}
		</InputOTPRoot>
	)
}

/** Unstyled visual group for adjacent OTP slots. */
const InputOTPGroup: Stateless<InputOTPGroupArgs> = ({
	children,
	'data-slot': slot = 'input-otp-group',
	...attrs
}) => (
	<div {...attrs} data-slot={slot}>
		{children}
	</div>
)

/** Unstyled OTP slot synchronized with the nearest OTP input. */
const InputOTPSlot: Stateless<InputOTPSlotArgs> = ({
	caretClass,
	caretMarkClass,
	children,
	index,
	role = 'presentation',
	'set:onclick': onClick,
	...attrs
}) => {
	const context = InputOTPContext()
	if (!context) throw new Error('InputOTPSlot must be used within an <InputOTP />')

	const char = context.value[index]
	const active = context.active === index
	const caret = active && !char && !context.disabled
	const state = active ? 'active' : 'inactive'

	return (
		<div
			{...attrs}
			aria-hidden="true"
			data-active={active ? 'true' : 'false'}
			data-disabled={context.disabled ? 'true' : undefined}
			data-slot="input-otp-slot"
			data-state={state}
			role={role}
			set:onclick={(event: MouseEvent) => {
				callHandler(onClick, event)
				if (!event.defaultPrevented && !context.disabled) context.focus(index)
			}}
		>
			{children ?? char}
			{caret && (
				<div aria-hidden="true" class={caretClass} data-slot="input-otp-caret">
					<div class={caretMarkClass} data-slot="input-otp-caret-mark" />
				</div>
			)}
		</div>
	)
}

/** Unstyled separator between OTP slot groups. */
const InputOTPSeparator: Stateless<InputOTPSeparatorArgs> = ({
	children,
	role = 'separator',
	'data-slot': slot = 'input-otp-separator',
	...attrs
}) => (
	<div {...attrs} data-slot={slot} role={role}>
		{children}
	</div>
)

export {
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
}
