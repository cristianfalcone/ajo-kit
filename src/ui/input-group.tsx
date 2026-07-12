import type { Stateless } from 'ajo'
import clsx from 'clsx'
import {
	InputGroup as BaseInputGroup,
	InputGroupAddon as BaseInputGroupAddon,
	InputGroupButton as BaseInputGroupButton,
	InputGroupInput as BaseInputGroupInput,
	InputGroupText as BaseInputGroupText,
	InputGroupTextarea as BaseInputGroupTextarea,
	type InputGroupAddonAlign,
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

const rootBase = [
	'group/input-group relative flex h-9 min-w-0 items-center rounded-md edge-input bg-transparent shadow-xs transition-[color,box-shadow] outline-none',
	'has-[>textarea]:h-auto',
	'has-[>[data-align=inline-start]]:[&>input]:pl-2',
	'has-[>[data-align=inline-end]]:[&>input]:pr-2',
	'has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3',
	'has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3',
	'has-[>input:focus-visible]:inset-ring-ring has-[>input:focus-visible]:ring-3 has-[>input:focus-visible]:ring-ring/25 has-[>textarea:focus-visible]:inset-ring-ring has-[>textarea:focus-visible]:ring-3 has-[>textarea:focus-visible]:ring-ring/25',
	// The >input ring path never matches contenteditable segment divs.
	'has-[[data-segment]:focus-visible]:inset-ring-ring has-[[data-segment]:focus-visible]:ring-3 has-[[data-segment]:focus-visible]:ring-ring/25',
	'has-[[data-slot][aria-invalid=true]]:inset-ring-danger has-[[data-slot][aria-invalid=true]]:ring-danger/20',
	// Group-level invalid rides aria-invalid on the group itself.
	'aria-invalid:inset-ring-danger aria-invalid:ring-danger/20',
].join(' ')
const widthClasses = {
	auto: undefined,
	full: 'w-full',
}

/** Builds shared chrome; full owns w-full, auto leaves width to the caller. */
export const inputGroupVariants = ({
	class: classes,
	width = 'full',
}: {
	class?: string
	width?: keyof typeof widthClasses
} = {}) => clsx(rootBase, widthClasses[width], classes)

/** Shared addon chrome for input-group compositions. */
export const inputGroupAddon = 'flex h-auto cursor-text select-none items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*=size-])]:size-4'

/** Placement deltas for input-group addons. */
export const inputGroupAddonAlign: Record<InputGroupAddonAlign, string> = {
	'block-end': 'order-last w-full justify-start px-3 pb-3 group-has-[>input]/input-group:pb-2.5 [&.border-t]:pt-3',
	'block-start': 'order-first w-full justify-start px-3 pt-3 group-has-[>input]/input-group:pt-2.5 [&.border-b]:pb-3',
	'inline-end': 'order-last pr-3 has-[>button]:mr-[-0.45rem] has-[>kbd]:mr-[-0.35rem]',
	'inline-start': 'order-first pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]',
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
/** Shared native input chrome inside input-group compositions. */
export const inputGroupInput = 'flex h-9 min-w-0 flex-1 rounded-none border-0 bg-transparent px-3 py-1 text-base shadow-none transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:ring-0 aria-invalid:ring-0'
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
		class={clsx(buttonVariants({ shadow: false, size: 'none', variant }), buttonSizeClasses[size], classes)}
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
