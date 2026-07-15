import type { Stateless } from 'ajo'
import clsx from 'clsx'
import {
	InputGroup as BaseInputGroup,
	InputGroupAddon as BaseInputGroupAddon,
	InputGroupButton as BaseInputGroupButton,
	InputGroupInput as BaseInputGroupInput,
	InputGroupText as BaseInputGroupText,
	InputGroupTextarea as BaseInputGroupTextarea,
	type InputGroupAddonArgs as BaseInputGroupAddonArgs,
	type InputGroupArgs as BaseInputGroupArgs,
	type InputGroupButtonArgs as BaseInputGroupButtonArgs,
	type InputGroupInputArgs as BaseInputGroupInputArgs,
	type InputGroupTextArgs as BaseInputGroupTextArgs,
	type InputGroupTextareaArgs as BaseInputGroupTextareaArgs,
} from 'ajo-ui/input-group'
import { FieldContext } from 'ajo-ui/field'
import type { FixedArgs, OmitArg } from 'ajo-ui/utils'
import { buttonVariants } from './button'
import type { ButtonVariant } from './button'
import {
	inputGroupAddon,
	inputGroupAddonAlign,
	inputGroupInput,
	inputGroupVariants,
} from './internal/recipes'
export type { InputGroupAddonAlign } from 'ajo-ui/input-group'

export type InputGroupButtonSize =
	| 'icon-sm'
	| 'icon-xs'
	| 'sm'
	| 'xs'

export type InputGroupArgs = BaseInputGroupArgs & {
	/** Additional UnoCSS classes. */
	class?: string
}

export type InputGroupAddonArgs = BaseInputGroupAddonArgs & {
	/** Additional UnoCSS classes. */
	class?: string
}

export type InputGroupButtonArgs = OmitArg<BaseInputGroupButtonArgs, 'data-size'> & FixedArgs<'data-size'> & {
	/** Button size inside input groups. */
	size?: InputGroupButtonSize
	/** Button variant. */
	variant?: ButtonVariant
	/** Additional UnoCSS classes. */
	class?: string
}

export type InputGroupTextArgs = BaseInputGroupTextArgs & {
	/** Additional UnoCSS classes. */
	class?: string
}

export type InputGroupInputArgs = BaseInputGroupInputArgs & {
	/** Additional UnoCSS classes. */
	class?: string
}

export type InputGroupTextareaArgs = BaseInputGroupTextareaArgs & {
	/** Additional UnoCSS classes. */
	class?: string
}

// Single owner of h/px/gap/rounded/svg sizing: buttonVariants emits no
// geometry at size:'none', so each recipe here must stay complete (clsx
// cannot resolve conflicting utilities).
const buttonSizeClasses: Record<InputGroupButtonSize, string> = {
	'icon-sm': 'size-8 gap-2 rounded-md p-0 has-[>svg]:p-0 [&_svg:not([class*=size-])]:size-4',
	'icon-xs': 'size-6 gap-2 rounded-[calc(var(--radius)-5px)] p-0 has-[>svg]:p-0 [&_svg:not([class*=size-])]:size-3',
	sm: 'h-8 gap-1.5 rounded-md px-2.5 has-[>svg]:px-2.5 [&_svg:not([class*=size-])]:size-4',
	xs: 'h-6 gap-1 rounded-[calc(var(--radius)-5px)] px-2 text-xs has-[>svg]:px-2 [&>svg:not([class*=size-])]:size-3.5',
}
const textBase = 'flex items-center gap-2 text-sm text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*=size-])]:size-4'
const textareaBase = 'flex min-h-16 min-w-0 flex-1 resize-none rounded-none border-0 bg-transparent px-3 py-3 text-base shadow-none transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm aria-invalid:ring-0'

/** Root wrapper for grouped inputs and addons. */
const InputGroup: Stateless<InputGroupArgs> = ({
	children,
	class: classes,
	disabled,
	...attrs
}) => (
	<BaseInputGroup
		{...attrs}
		class={inputGroupVariants({ class: classes })}
		disabled={disabled}
	>
		{children}
	</BaseInputGroup>
)

/** Addon area for icons, text, buttons, or helper content. */
const InputGroupAddon: Stateless<InputGroupAddonArgs> = ({
	align = 'inline-start',
	children,
	class: classes,
	'set:onclick': onclick,
	...attrs
}) => (
	<BaseInputGroupAddon
		{...attrs}
		align={align}
		class={clsx(inputGroupAddon, inputGroupAddonAlign[align], classes)}
		set:onclick={onclick}
	>
		{children}
	</BaseInputGroupAddon>
)

/** Button sized for InputGroup addons. */
const InputGroupButton: Stateless<InputGroupButtonArgs> = ({
	children,
	class: classes,
	'data-slot': slot = 'input-group-button',
	size = 'xs',
	type = 'button',
	variant = 'ghost',
	...attrs
}) => (
	<BaseInputGroupButton
		{...attrs}
		class={clsx(buttonVariants({ size: 'none', variant }), buttonSizeClasses[size], classes)}
		data-size={size}
		data-slot={slot}
		type={type}
	>
		{children}
	</BaseInputGroupButton>
)

/** Text helper for InputGroup addons. */
const InputGroupText: Stateless<InputGroupTextArgs> = ({ children, class: classes, ...attrs }) => (
	<BaseInputGroupText {...attrs} class={clsx(textBase, classes)}>
		{children}
	</BaseInputGroupText>
)

/** Input control styled for InputGroup. */
const InputGroupInput: Stateless<InputGroupInputArgs> = ({
	class: classes,
	'data-slot': slot = 'input-group-control',
	type = 'text',
	...attrs
}) => {
	const field = FieldContext()

	return (
		<BaseInputGroupInput
			{...(field?.controlAttrs ?? {})}
			{...attrs}
			class={clsx(inputGroupInput, classes)}
			data-slot={slot}
			type={type}
		/>
	)
}

/** Textarea control styled for InputGroup. */
const InputGroupTextarea: Stateless<InputGroupTextareaArgs> = ({
	children,
	class: classes,
	...attrs
}) => {
	const field = FieldContext()

	return (
		<BaseInputGroupTextarea
			{...(field?.controlAttrs ?? {})}
			{...attrs}
			class={clsx(textareaBase, classes)}
		>
			{children}
		</BaseInputGroupTextarea>
	)
}

export {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
	InputGroupTextarea,
}
