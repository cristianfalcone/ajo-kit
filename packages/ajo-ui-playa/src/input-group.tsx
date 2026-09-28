import type { Stateless } from 'ajo'
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
import { clx, type FixedArgs, type OmitArg } from 'ajo-ui/utils'
import { buttonVariants } from './button'
import type { ButtonVariant } from './button'
import type { InputSize } from './input'
import { inputGroupAddon, inputGroupAddonAlign, inputGroupVariants } from './internal/input-group'
export type { InputGroupAddonAlign } from 'ajo-ui/input-group'

/** Shape of an InputGroup button; its height follows the group's size. */
export type InputGroupButtonSize = 'default' | 'icon'

export type InputGroupArgs = BaseInputGroupArgs & {
	/** Control height of the group, which its addons and buttons follow. */
	size?: InputSize
	/** Additional UnoCSS classes. */
	class?: string
}

export type InputGroupAddonArgs = BaseInputGroupAddonArgs & {
	/** Additional UnoCSS classes. */
	class?: string
}

export type InputGroupButtonArgs = OmitArg<BaseInputGroupButtonArgs, 'data-size'> & FixedArgs<'data-size'> & {
	/** Text button or square icon button. */
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
// geometry at size:'none', so each recipe here must stay complete (clx
// cannot resolve conflicting utilities). A button is 8px shorter than its
// group, so it sits 4px inside the boundary with a concentric corner, and
// takes the group's text size below sm.
const buttonSizeClasses: Record<InputGroupButtonSize, string> = {
	default: 'h-7 gap-1 rounded-sm px-3 max-sm:text-base group-data-[size=sm]/input-group:h-6 group-data-[size=lg]/input-group:h-8 [&_svg:not([class*=size-])]:size-4',
	icon: 'size-7 rounded-sm max-sm:text-base group-data-[size=sm]/input-group:size-6 group-data-[size=lg]/input-group:size-8 [&_svg:not([class*=size-])]:size-4',
}
// The control stretches across the group's height, or its width when
// stacked addons turn the group into a column, and inherits its text size.
const inputBase = 'flex min-w-0 flex-1 self-stretch bg-transparent px-3 py-1 outline-none playa-disabled selection:bg-primary selection:text-primary-foreground'
const textBase = 'flex items-center gap-2 [&_svg]:pointer-events-none [&_svg:not([class*=size-])]:size-4'
const textareaBase = 'flex min-h-16 min-w-0 flex-1 self-stretch resize-none bg-transparent px-3 py-3 outline-none playa-disabled selection:bg-primary selection:text-primary-foreground'

/** Root wrapper for grouped inputs and addons. */
const InputGroup: Stateless<InputGroupArgs> = ({ class: classes, size = 'default', ...attrs }) => (
	<BaseInputGroup {...attrs} class={inputGroupVariants({ class: classes })} data-size={size} />
)

/** Addon area for icons, text, buttons, or helper content. */
const InputGroupAddon: Stateless<InputGroupAddonArgs> = ({ align = 'inline-start', class: classes, ...attrs }) => (
	<BaseInputGroupAddon {...attrs} align={align} class={clx(inputGroupAddon, inputGroupAddonAlign[align], classes)} />
)

/** Button sized for InputGroup addons. */
const InputGroupButton: Stateless<InputGroupButtonArgs> = ({ class: classes, size = 'default', variant = 'ghost', ...attrs }) => (
	<BaseInputGroupButton
		{...attrs}
		class={clx(buttonVariants({ size: 'none', variant }), buttonSizeClasses[size], classes)}
		data-size={size}
	/>
)

/** Text helper for InputGroup addons. */
const InputGroupText: Stateless<InputGroupTextArgs> = ({ class: classes, ...attrs }) => (
	<BaseInputGroupText {...attrs} class={clx(textBase, classes)} />
)

/** Input control styled for InputGroup. */
const InputGroupInput: Stateless<InputGroupInputArgs> = ({ class: classes, ...attrs }) => (
	<BaseInputGroupInput {...attrs} class={clx(inputBase, classes)} />
)

/** Textarea control styled for InputGroup. */
const InputGroupTextarea: Stateless<InputGroupTextareaArgs> = ({ class: classes, ...attrs }) => (
	<BaseInputGroupTextarea {...attrs} class={clx(textareaBase, classes)} />
)

export {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
	InputGroupTextarea,
}
