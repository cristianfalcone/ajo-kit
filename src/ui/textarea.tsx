import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'
import { FieldContext } from 'ajo-ui/field'

export type TextareaArgs = WithChildren<IntrinsicElements['textarea']>

const base = 'flex field-sizing-content min-h-16 w-full rounded-md edge-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:inset-ring-ring focus-visible:ring-3 focus-visible:ring-ring/25 aria-invalid:inset-ring-danger aria-invalid:ring-danger/20'

/** Multi-line form control with shared field styling. */
const Textarea: Stateless<TextareaArgs> = ({
	class: classes,
	children,
	...attrs
}) => {
	const field = FieldContext()

	return (
		<textarea
			{...(field?.controlAttrs ?? {})}
			{...attrs}
			class={clsx(base, classes)}
			data-slot="textarea"
		>
			{children}
		</textarea>
	)
}

export { Textarea }
export default Textarea
