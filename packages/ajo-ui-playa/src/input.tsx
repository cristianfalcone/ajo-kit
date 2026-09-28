import type { IntrinsicElements, Stateless } from 'ajo'
import { clx } from 'ajo-ui/utils'
import { FieldContext } from 'ajo-ui/field'

export type InputArgs = IntrinsicElements['input']

const base = 'flex h-control w-full min-w-0 playa-field playa-disabled px-3 py-1 text-base selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground sm:text-sm'

/** Text-like form control with shared field styling. */
const Input: Stateless<InputArgs> = ({
	class: classes,
	type = 'text',
	...attrs
}) => {
	const field = FieldContext()

	return (
		<input
			{...(field?.controlAttrs ?? {})}
			{...attrs}
			class={clx(base, classes)}
			data-slot="input"
			type={type}
		/>
	)
}

export { Input }
