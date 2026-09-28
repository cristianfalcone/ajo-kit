import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { clx, type OmitArg } from 'ajo-ui/utils'
import { FieldContext } from 'ajo-ui/field'
import { buttonVariants } from './button'

/** Control height, on the scale Button, Select and InputGroup share. */
export type InputSize = 'default' | 'lg' | 'sm'

export type InputArgs = OmitArg<IntrinsicElements['input'], 'size'> & {
	/** Control height, stamped as `data-size`. */
	size?: InputSize
}

export type InputFileArgs = WithChildren<OmitArg<IntrinsicElements['input'], 'placeholder' | 'size' | 'type'> & {
	/** Shown while no file is chosen, in the page's language. */
	placeholder?: string
	/** Additional UnoCSS classes for the field. */
	class?: string
}>

const base = 'flex h-control w-full min-w-0 playa-field playa-disabled px-3 py-1 text-base data-[size=sm]:h-control-sm data-[size=lg]:h-control-lg selection:bg-primary selection:text-primary-foreground sm:text-sm'

// The native file input covers the field, invisible, so a click or a dropped
// file anywhere reaches it, while the field shows the caller's words instead
// of the browser's: the button's label and the chosen names or the placeholder.
const fileBase = 'group/input-file relative flex h-control w-full min-w-0 items-center gap-3 playa-field playa-field-within ps-1 pe-3 text-base has-disabled:pointer-events-none has-disabled:opacity-[var(--disabled-opacity)] sm:text-sm'
const fileControl = 'absolute inset-0 size-full opacity-0 enabled:cursor-pointer'
// The button part is Playa's secondary button, 4px inside the field; the
// field takes its hover, since the native input lies over it.
const fileButton = clx(buttonVariants({ size: 'none', variant: 'secondary' }), 'h-7 rounded-sm px-3 max-sm:text-base group-hover/input-file:bg-muted')

/** Text-like form control with shared field styling; a file goes through InputFile. */
const Input: Stateless<InputArgs> = ({
	class: classes,
	size = 'default',
	type = 'text',
	...attrs
}) => {
	const field = FieldContext()

	return (
		<input
			{...(field?.controlAttrs ?? {})}
			{...attrs}
			class={clx(base, classes)}
			data-size={size}
			data-slot="input"
			type={type}
		/>
	)
}

// The runtime routes `ref` and `set:*` on a stateful component to its host:
// `ref` comes back as `inputRef`, so it reaches the input as on Input, and
// `set:` handlers stay on the field, where the input's events bubble.
type InputFileRootArgs = OmitArg<InputFileArgs, 'ref'> & { inputRef?: InputFileArgs['ref'] }

const InputFileRoot: Stateful<InputFileRootArgs> = function* () {
	let input: HTMLInputElement | null = null
	let names = ''
	const read = () => this.next(() => names = Array.from(input?.files ?? [], file => file.name).join(', '))

	// A form reset empties the input after its event, so the names follow a task later.
	if (typeof document != 'undefined' && this.nodeType == 1) {
		document.addEventListener('reset', event => event.target === input?.form && setTimeout(read), { signal: this.signal })
	}

	for (const { children, inputRef, placeholder, ...attrs } of this) yield (
		<>
			<input
				{...attrs}
				class={fileControl}
				data-slot="input-file-control"
				ref={element => {
					input = element
					inputRef?.(element)
				}}
				type="file"
				set:onchange={read}
			/>
			<span aria-hidden="true" class={fileButton} data-slot="input-file-button">{children}</span>
			<span aria-hidden="true" class={clx('min-w-0 truncate', !names && 'text-faint-foreground')} data-slot="input-file-value">{names || placeholder}</span>
		</>
	)
}

/** File field: a button labelled by its children and the chosen file names, or the placeholder. */
const InputFile: Stateless<InputFileArgs> = ({ class: classes, ref, ...attrs }) => (
	<InputFileRoot
		{...(FieldContext()?.controlAttrs ?? {})}
		{...attrs}
		inputRef={ref}
		attr:class={clx(fileBase, classes)}
		attr:data-slot="input-file"
	/>
)

export { Input, InputFile }
