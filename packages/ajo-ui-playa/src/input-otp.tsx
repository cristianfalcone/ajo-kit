import type { Stateless } from 'ajo'
import {
	InputOTP as BaseInputOTP,
	InputOTPGroup as BaseInputOTPGroup,
	InputOTPSeparator as BaseInputOTPSeparator,
	InputOTPSlot as BaseInputOTPSlot,
	type InputOTPArgs as BaseInputOTPArgs,
	type InputOTPGroupArgs as BaseInputOTPGroupArgs,
	type InputOTPSeparatorArgs as BaseInputOTPSeparatorArgs,
	type InputOTPSlotArgs as BaseInputOTPSlotArgs,
} from 'ajo-ui/input-otp'
import { clx, type FixedArgs, type OmitArg } from 'ajo-ui/utils'

export { REGEXP_ONLY_DIGITS, REGEXP_ONLY_DIGITS_AND_CHARS } from 'ajo-ui/input-otp'

export type InputOTPArgs = OmitArg<BaseInputOTPArgs, 'class' | 'inputClass'> & {
	/** Additional UnoCSS classes for the visible root. */
	class?: string
	/** Additional UnoCSS classes for the hidden native input. */
	inputClass?: string
}

export type InputOTPGroupArgs = BaseInputOTPGroupArgs & { class?: string }

export type InputOTPSlotArgs = OmitArg<
	BaseInputOTPSlotArgs,
	'caretClass' | 'caretMarkClass'
> & FixedArgs<'caretClass' | 'caretMarkClass'> & { class?: string }

export type InputOTPSeparatorArgs = OmitArg<BaseInputOTPSeparatorArgs, 'children'> & FixedArgs<'children'> & { class?: string }

// A code reads left to right in every direction, as it arrives in a message.
// The slots share the group's boundary and the control height; the playa-otp
// rule owns the active slot's outline, the caret and the invalid boundary.
const containerBase = 'flex items-center gap-2 playa-otp [direction:ltr] has-disabled:opacity-[var(--disabled-opacity)]'
const hiddenInputBase = 'sr-only disabled:cursor-not-allowed'
const groupBase = 'flex items-center playa-field'
const slotBase = 'relative flex size-control items-center justify-center border-s border-input text-base first:rounded-s-md first:border-s-0 last:rounded-e-md sm:text-sm'
const separatorBase = 'flex'
const caretBase = 'pointer-events-none absolute inset-0 flex items-center justify-center'
const caretMark = 'h-4 w-px animate-caret-blink bg-foreground duration-1000'

/** One-time password input with visible slots and a real hidden input. */
const InputOTP: Stateless<InputOTPArgs> = ({
	children,
	class: classes,
	disabled,
	inputClass,
	...attrs
}) => (
	<BaseInputOTP
		{...attrs}
		class={clx(containerBase, classes)}
		disabled={disabled}
		inputClass={clx(hiddenInputBase, inputClass)}
	>
		{children}
	</BaseInputOTP>
)

/** Visual group for adjacent OTP slots. */
const InputOTPGroup: Stateless<InputOTPGroupArgs> = ({ children, class: classes, ...attrs }) => (
	<BaseInputOTPGroup {...attrs} class={clx(groupBase, classes)}>
		{children}
	</BaseInputOTPGroup>
)

/** Visual OTP slot synchronized with the nearest InputOTP value. */
const InputOTPSlot: Stateless<InputOTPSlotArgs> = ({
	children,
	class: classes,
	index,
	...attrs
}) => (
	<BaseInputOTPSlot
		{...attrs}
		caretClass={caretBase}
		caretMarkClass={caretMark}
		class={clx(slotBase, classes)}
		index={index}
	>
		{children}
	</BaseInputOTPSlot>
)

/** Visual separator between OTP slot groups. */
const InputOTPSeparator: Stateless<InputOTPSeparatorArgs> = ({
	children: _children,
	class: classes,
	role = 'separator',
	...attrs
}) => (
	<BaseInputOTPSeparator {...attrs} class={clx(separatorBase, classes)} role={role}>
		<span aria-hidden="true" class="i-lucide-minus size-4" />
	</BaseInputOTPSeparator>
)

export {
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
}
