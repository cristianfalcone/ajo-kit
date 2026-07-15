import type { Stateless } from 'ajo'
import clsx from 'clsx'
import {
	ToggleGroup as BaseToggleGroup,
	ToggleGroupContext as BaseToggleGroupContext,
	ToggleGroupItem as BaseToggleGroupItem,
	type ToggleGroupArgs as BaseToggleGroupArgs,
	type ToggleGroupItemArgs as BaseToggleGroupItemArgs,
	type ToggleGroupMultipleArgs as BaseToggleGroupMultipleArgs,
	type ToggleGroupOrientation as BaseToggleGroupOrientation,
	type ToggleGroupSingleArgs as BaseToggleGroupSingleArgs,
	type ToggleGroupType as BaseToggleGroupType,
} from 'ajo-ui/toggle-group'
import { type ToggleSize, type ToggleVariant, toggleVariants } from './toggle'
import { stlx } from 'ajo-ui/utils'

export type ToggleGroupType = BaseToggleGroupType
export type ToggleGroupOrientation = BaseToggleGroupOrientation

type ThemeToggleGroupArgs = {
	class?: string
	size?: ToggleSize
	variant?: ToggleVariant
}

export type ToggleGroupSingleArgs = BaseToggleGroupSingleArgs & ThemeToggleGroupArgs
export type ToggleGroupMultipleArgs = BaseToggleGroupMultipleArgs & ThemeToggleGroupArgs

export type ToggleGroupArgs = ToggleGroupSingleArgs | ToggleGroupMultipleArgs

export type ToggleGroupItemArgs = BaseToggleGroupItemArgs & ThemeToggleGroupArgs

const rootBase = 'group/toggle-group flex w-fit items-center rounded-md gap-[var(--toggle-group-gap)]'
const rootOrientation: Record<ToggleGroupOrientation, string> = {
	horizontal: 'flex-row',
	vertical: 'flex-col',
}
const itemBase = 'w-auto min-w-0 shrink-0 px-3 focus:z-10 focus-visible:z-10'

const style = (spacing: number, current: unknown) => {
	const gap = `${Math.max(0, spacing) * 0.25}rem`
	return stlx(typeof current === 'string' ? current : undefined, { '--toggle-group-gap': gap })
}

const connected = (spacing: number, orientation: ToggleGroupOrientation) => {
	if (spacing !== 0) return ''

	// Connected segments touch instead of overlapping: the non-first ring
	// drops its leading edge (three inset shadows), so every seam is painted
	// by exactly one hairline — two overlapped translucent rings would
	// composite darker than the group's outer edges. `relative` lets the
	// focused item's z-10 lift its focus ring above its neighbors.
	return orientation === 'vertical'
		? 'relative rounded-none first:rounded-t-md last:rounded-b-md [&:not(:first-child)]:[--un-inset-ring-shadow:inset_1px_0_0_var(--un-inset-ring-color,currentColor),inset_-1px_0_0_var(--un-inset-ring-color,currentColor),inset_0_-1px_0_var(--un-inset-ring-color,currentColor)]'
		: 'relative rounded-none first:rounded-l-md last:rounded-r-md [&:not(:first-child)]:[--un-inset-ring-shadow:inset_0_1px_0_var(--un-inset-ring-color,currentColor),inset_0_-1px_0_var(--un-inset-ring-color,currentColor),inset_-1px_0_0_var(--un-inset-ring-color,currentColor)]'
}

const toggleSize = (value: unknown): ToggleSize | undefined =>
	value === 'sm' || value === 'lg' || value === 'default' ? value : undefined

const toggleVariant = (value: unknown): ToggleVariant | undefined =>
	value === 'outline' || value === 'default' ? value : undefined

/** Group of toggle buttons with single or multiple selection. */
const ToggleGroup: Stateless<ToggleGroupArgs> = ({
	class: classes,
	loop = true,
	orientation = 'horizontal',
	role = 'group',
	size = 'default',
	spacing = 2,
	style: styles,
	variant = 'default',
	...attrs
}) => {
	const rootClass = clsx(rootBase, rootOrientation[orientation], classes)
	const rootStyle = style(spacing, styles)

	return (
		<BaseToggleGroup
			{...attrs as BaseToggleGroupArgs}
			class={rootClass}
			loop={loop}
			orientation={orientation}
			role={role}
			size={size}
			spacing={spacing}
			style={rootStyle}
			variant={variant}
		/>
	)
}

/** Toggle button item that participates in a parent ToggleGroup. */
const ToggleGroupItem: Stateless<ToggleGroupItemArgs> = ({
	class: classes,
	disabled,
	size,
	value,
	variant,
	...attrs
}) => {
	const group = BaseToggleGroupContext()
	const itemValue = String(value)
	const groupVariant = toggleVariant(variant) ?? toggleVariant(group?.variant) ?? 'default'
	const groupSize = toggleSize(size) ?? toggleSize(group?.size) ?? 'default'
	const groupSpacing = group?.spacing ?? 2
	const groupOrientation = group?.orientation ?? 'horizontal'
	const itemClass = typeof classes === 'string' ? classes : undefined

	return (
		<BaseToggleGroupItem
			{...attrs}
			disabled={disabled}
			size={groupSize}
			value={itemValue}
			variant={groupVariant}
			class={clsx(
				toggleVariants({ size: groupSize, variant: groupVariant }),
				itemBase,
				connected(groupSpacing, groupOrientation),
				itemClass,
			)}
		/>
	)
}

export { ToggleGroup, ToggleGroupItem }
