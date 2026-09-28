import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import { clx } from 'ajo-ui/utils'
import { FieldContext } from 'ajo-ui/field'

export type TextareaArgs = WithChildren<IntrinsicElements['textarea']>

const base = 'flex field-sizing-content min-h-16 w-full playa-field playa-disabled px-3 py-2 text-base selection:bg-primary selection:text-primary-foreground sm:text-sm'

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
			class={clx(base, classes)}
			data-slot="textarea"
		>
			{children}
		</textarea>
	)
}

export { Textarea }
