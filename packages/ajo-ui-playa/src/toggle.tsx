import type { Stateless } from 'ajo'
import {
	Toggle as BaseToggle,
	type ToggleArgs as BaseToggleArgs,
} from 'ajo-ui/toggle'
import { toggleVariants } from './internal/toggle'

export type ToggleVariant = 'default' | 'outline'
export type ToggleSize = 'default' | 'lg' | 'sm'

export type ToggleArgs = BaseToggleArgs & {
	/** Visual toggle treatment. */
	variant?: ToggleVariant
	/** Toggle size. */
	size?: ToggleSize
	/** Additional UnoCSS classes. */
	class?: string
}

/** Two-state button using aria-pressed. */
const Toggle: Stateless<ToggleArgs> = ({
	class: classes,
	size = 'default',
	variant = 'default',
	...attrs
}) => (
	<BaseToggle
		{...attrs}
		class={toggleVariants({ class: classes, size, variant })}
		data-size={size}
		data-variant={variant}
	/>
)

export { Toggle }
