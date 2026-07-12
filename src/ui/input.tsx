import type { IntrinsicElements, Stateless } from 'ajo'
import clsx from 'clsx'
import { FieldContext } from 'ajo-ui/field'

export type InputArgs = IntrinsicElements['input']

const base = 'flex h-9 w-full min-w-0 rounded-md edge-input bg-transparent px-3 py-1 text-base transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:inset-ring-ring focus-visible:ring-3 focus-visible:ring-ring/25 aria-invalid:inset-ring-danger aria-invalid:ring-danger/20'

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
			class={clsx(base, classes)}
			data-slot="input"
			type={type}
		/>
	)
}

export { Input }
export default Input
