import type { Args, IntrinsicElements, Stateless, WithChildren } from 'ajo'
import { clx } from 'ajo-ui/utils'
import { Separator, type SeparatorArgs } from './separator'

export type ButtonGroupOrientation = 'horizontal' | 'vertical'

export type ButtonGroupArgs = WithChildren<IntrinsicElements['div'] & {
	/** Layout direction for grouped controls. */
	orientation?: ButtonGroupOrientation
	/** Additional UnoCSS classes. */
	class?: string
}>

export type ButtonGroupSeparatorArgs = SeparatorArgs

type ButtonGroupTextBaseArgs = WithChildren<{
	/** Semantic element to render. Prefer this over React/Radix `asChild`. */
	as?: 'div' | 'label' | 'span'
	/** Additional UnoCSS classes. */
	class?: string
}>

type ButtonGroupTextAsDiv = ButtonGroupTextBaseArgs & IntrinsicElements['div'] & {
	as?: 'div'
}

type ButtonGroupTextAsLabel = ButtonGroupTextBaseArgs & IntrinsicElements['label'] & {
	as: 'label'
}

type ButtonGroupTextAsSpan = ButtonGroupTextBaseArgs & IntrinsicElements['span'] & {
	as: 'span'
}

export type ButtonGroupTextArgs =
	| ButtonGroupTextAsDiv
	| ButtonGroupTextAsLabel
	| ButtonGroupTextAsSpan

const groupBase = 'flex w-fit items-stretch has-[>[data-slot=button-group]]:gap-2 [&>*]:focus-visible:relative [&>*]:focus-visible:z-10 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-md [&>[data-slot=select-trigger]:not([class*=w-])]:w-fit [&>input]:flex-1'
const groupOrientations: Record<ButtonGroupOrientation, string> = {
	// Segments touch instead of overlapping: the non-first ring drops its
	// leading edge (three inset shadows), so every seam is painted by exactly
	// one hairline in that member's own ring color — two overlapped
	// translucent rings would composite darker than the outer edges. Ringless
	// members (solid buttons, separators) are untouched: the variable only
	// manifests where a ring already sets box-shadow.
	horizontal: '[&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none [&>*:not(:first-child)]:[--un-inset-ring-shadow:inset_0_1px_0_var(--un-inset-ring-color,currentColor),inset_0_-1px_0_var(--un-inset-ring-color,currentColor),inset_-1px_0_0_var(--un-inset-ring-color,currentColor)]',
	vertical: 'flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none [&>*:not(:first-child)]:[--un-inset-ring-shadow:inset_1px_0_0_var(--un-inset-ring-color,currentColor),inset_-1px_0_0_var(--un-inset-ring-color,currentColor),inset_0_-1px_0_var(--un-inset-ring-color,currentColor)]',
}
const textBase = 'flex items-center gap-2 rounded-md edge bg-muted px-4 text-sm font-medium [&_svg]:pointer-events-none [&_svg:not([class*=size-])]:size-4'
// Separator fills its axis; inside a group the rule stretches with its
// neighbours instead, so these sizes and the input tone must win outright.
const separatorBase = 'relative m-0 self-stretch !bg-input data-[orientation=horizontal]:!w-auto data-[orientation=vertical]:!h-auto'

/** Group related action buttons or mixed controls. */
const ButtonGroup: Stateless<ButtonGroupArgs> = ({
	class: classes,
	orientation = 'horizontal',
	role = 'group',
	...attrs
}) => (
	<div
		{...attrs}
		class={clx(groupBase, groupOrientations[orientation], classes)}
		data-orientation={orientation}
		data-slot="button-group"
		role={role}
	/>
)

/** Visual divider for ButtonGroup contents; vertical unless the group stacks. */
const ButtonGroupSeparator: Stateless<ButtonGroupSeparatorArgs> = ({ class: classes, orientation = 'vertical', ...attrs }) => (
	<Separator {...attrs} class={clx(separatorBase, classes)} data-slot="button-group-separator" orientation={orientation} />
)

/** Text or label segment for mixed button/input groups. */
const ButtonGroupText: Stateless<ButtonGroupTextArgs> = ({ as: Tag = 'div', class: classes, ...attrs }) => (
	<Tag {...(attrs as Args)} class={clx(textBase, classes)} data-slot="button-group-text" />
)

export {
	ButtonGroup,
	ButtonGroupSeparator,
	ButtonGroupText,
}
