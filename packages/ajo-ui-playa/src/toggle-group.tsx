import type { Stateful, Stateless, WithChildren } from 'ajo'
import { context } from 'ajo/context'
import {
	ToggleGroup as BaseToggleGroup,
	ToggleGroupItem as BaseToggleGroupItem,
	type ToggleGroupArgs as BaseToggleGroupArgs,
	type ToggleGroupItemArgs as BaseToggleGroupItemArgs,
	type ToggleGroupMultipleArgs as BaseToggleGroupMultipleArgs,
	type ToggleGroupSingleArgs as BaseToggleGroupSingleArgs,
} from 'ajo-ui/toggle-group'
import { clx, stlx } from 'ajo-ui/utils'
import { toggleVariants } from './internal/toggle'
import { segmentSeams } from './internal/seams'
import type { ToggleSize, ToggleVariant } from './toggle'
export type { ToggleGroupOrientation, ToggleGroupType } from 'ajo-ui/toggle-group'

type ItemTheme = {
	/** Item size; the group's size applies to every item that sets none. */
	size?: ToggleSize
	/** Item variant; the group's variant applies to every item that sets none. */
	variant?: ToggleVariant
}

type ThemeToggleGroupArgs = ItemTheme & {
	/** Additional UnoCSS classes. */
	class?: string
	/** Gap between items in 0.25rem steps; 0 joins them into one segmented control. */
	spacing?: number
}

export type ToggleGroupSingleArgs = BaseToggleGroupSingleArgs & ThemeToggleGroupArgs
export type ToggleGroupMultipleArgs = BaseToggleGroupMultipleArgs & ThemeToggleGroupArgs

export type ToggleGroupArgs = ToggleGroupSingleArgs | ToggleGroupMultipleArgs

export type ToggleGroupItemArgs = BaseToggleGroupItemArgs & ItemTheme & {
	/** Additional UnoCSS classes. */
	class?: string
}

const rootBase = 'group/toggle-group flex w-fit items-center rounded-md gap-[var(--toggle-group-gap)]'
const rootOrientation = {
	horizontal: 'flex-row',
	vertical: 'flex-col',
}
const itemBase = 'w-auto min-w-0 shrink-0 px-3 focus:z-10 focus-visible:z-10'

const ItemThemeContext = context<ItemTheme>({})

// Stateless adapters cannot write context, so the group's item size and
// variant ride on this layout-free (display: contents) host around the items.
// It also carries the connected seams, since the items are its children.
const Items: Stateful<WithChildren<ItemTheme>> = function* () {
	for (const { children, size, variant } of this) {
		ItemThemeContext({ size, variant })
		yield <>{children}</>
	}
}

/** Group of toggle buttons with single or multiple selection. */
const ToggleGroup: Stateless<ToggleGroupArgs> = ({
	children,
	class: classes,
	orientation = 'horizontal',
	size,
	spacing = 2,
	style,
	variant,
	...attrs
}) => (
	<BaseToggleGroup
		{...attrs as BaseToggleGroupArgs}
		class={clx(rootBase, rootOrientation[orientation], classes)}
		orientation={orientation}
		style={stlx(style, { '--toggle-group-gap': `${spacing * 0.25}rem` })}
	>
		<Items attr:class={clx('contents', spacing === 0 && segmentSeams[orientation])} size={size} variant={variant}>
			{children}
		</Items>
	</BaseToggleGroup>
)

/** Toggle button item that participates in a parent ToggleGroup. */
const ToggleGroupItem: Stateless<ToggleGroupItemArgs> = ({
	class: classes,
	size,
	variant,
	...attrs
}) => {
	const group = ItemThemeContext()

	return (
		<BaseToggleGroupItem
			{...attrs}
			class={clx(toggleVariants({ size: size ?? group.size, variant: variant ?? group.variant }), itemBase, classes)}
		/>
	)
}

export { ToggleGroup, ToggleGroupItem }
