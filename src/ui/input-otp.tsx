import type { Stateless } from 'ajo'
import clsx from 'clsx'
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
import { FieldContext } from 'ajo-ui/field'
import type { FixedArgs, OmitArg } from 'ajo-ui/utils'

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

const containerBase = 'flex items-center gap-2 has-disabled:opacity-50'
const hiddenInputBase = 'sr-only disabled:cursor-not-allowed'
const groupBase = 'flex items-center rounded-md edge-input bg-transparent shadow-xs has-[[aria-invalid=true]]:inset-ring-danger'
const slotBase = 'relative flex h-9 w-9 items-center justify-center border-l border-input text-sm transition-all outline-none first:rounded-l-md first:border-l-0 last:rounded-r-md aria-invalid:border-danger data-[active=true]:z-10 data-[active=true]:inset-ring data-[active=true]:inset-ring-ring data-[active=true]:ring-3 data-[active=true]:ring-ring/25 data-[active=true]:aria-invalid:inset-ring-danger data-[active=true]:aria-invalid:ring-danger/20'
const caretBase = 'pointer-events-none absolute inset-0 flex items-center justify-center'
const caretMark = 'h-4 w-px animate-caret-blink bg-foreground duration-1000'

/** One-time password input with visible slots and a real hidden input. */
const InputOTP: Stateless<InputOTPArgs> = ({
	children,
	class: classes,
	disabled,
	inputClass,
	...attrs
}) => {
	const field = FieldContext()

	return (
		<BaseInputOTP
			{...(field?.controlAttrs ?? {})}
			{...attrs}
			class={clsx(containerBase, classes)}
			disabled={disabled}
			inputClass={clsx(hiddenInputBase, inputClass)}
		>
			{children}
		</BaseInputOTP>
	)
}

/** Visual group for adjacent OTP slots. */
const InputOTPGroup: Stateless<InputOTPGroupArgs> = ({ children, class: classes, ...attrs }) => (
	<BaseInputOTPGroup {...attrs} class={clsx(groupBase, classes)}>
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
		class={clsx(slotBase, classes)}
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
	<BaseInputOTPSeparator {...attrs} class={classes} role={role}>
		<span aria-hidden="true" class="i-lucide-minus size-4" />
	</BaseInputOTPSeparator>
)

export {
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
}
