import type { Args, IntrinsicElements, Stateless, WithChildren } from 'ajo'
import { clx } from 'ajo-ui/utils'
import { segmentSeams } from './internal/seams'
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

const groupBase = 'playa-button-group flex w-fit items-stretch has-[>[data-slot=button-group]]:gap-2 [&>*]:focus-visible:relative [&>*]:focus-visible:z-10 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-md [&>[data-slot=select-trigger]:not([class*=w-])]:w-fit [&>input]:flex-1'
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
		class={clx(groupBase, orientation === 'vertical' && 'flex-col', segmentSeams[orientation], classes)}
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
