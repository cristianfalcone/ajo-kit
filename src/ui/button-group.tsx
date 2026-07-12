import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'

export type ButtonGroupOrientation = 'horizontal' | 'vertical'

export type ButtonGroupArgs = WithChildren<IntrinsicElements['div'] & {
	/** Layout direction for grouped controls. */
	orientation?: ButtonGroupOrientation
	/** Additional UnoCSS classes. */
	class?: string
}>

export type ButtonGroupSeparatorArgs = IntrinsicElements['div'] & {
	/** Separator direction. Defaults to vertical for horizontal groups. */
	orientation?: ButtonGroupOrientation
	/** Additional UnoCSS classes. */
	class?: string
}

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
	// Negative margins overlap adjacent inset-ring hairlines into a single
	// 1px seam; an inset ring cannot drop one side like `border-l-0`.
	horizontal: '[&>*:not(:first-child)]:-ml-px [&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none',
	vertical: 'flex-col [&>*:not(:first-child)]:-mt-px [&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none',
}
const textBase = 'flex items-center gap-2 rounded-md edge bg-muted px-4 text-sm font-medium shadow-xs [&_svg]:pointer-events-none [&_svg:not([class*=size-])]:size-4'
const separatorBase = 'relative m-0 self-stretch bg-input data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-auto data-[orientation=vertical]:h-auto data-[orientation=vertical]:w-px'

/** Returns the UnoCSS class list for a ButtonGroup root. */
export const buttonGroupVariants = ({
	class: classes,
	orientation = 'horizontal',
}: {
	class?: string
	orientation?: ButtonGroupOrientation
} = {}) => clsx(groupBase, groupOrientations[orientation], classes)

/** Group related action buttons or mixed controls. */
const ButtonGroup: Stateless<ButtonGroupArgs> = ({
	children,
	class: classes,
	orientation = 'horizontal',
	...attrs
}) => (
	<div
		{...attrs}
		class={buttonGroupVariants({ class: classes, orientation })}
		data-orientation={orientation}
		data-slot="button-group"
		role={attrs.role ?? 'group'}
	>
		{children}
	</div>
)

/** Visual divider for ButtonGroup contents. */
const ButtonGroupSeparator: Stateless<ButtonGroupSeparatorArgs> = ({
	class: classes,
	orientation = 'vertical',
	...attrs
}) => (
	<div
		{...attrs}
		aria-hidden="true"
		class={clsx(separatorBase, classes)}
		data-orientation={orientation}
		data-slot="button-group-separator"
		role={attrs.role ?? 'none'}
	/>
)

/** Text or label segment for mixed button/input groups. */
const ButtonGroupText: Stateless<ButtonGroupTextArgs> = ({
	as = 'div',
	children,
	class: classes,
	...attrs
}) => {
	const styles = clsx(textBase, classes)

	if (as === 'label') {
		const label = attrs as IntrinsicElements['label']
		return (
			<label {...label} class={styles} data-slot="button-group-text">
				{children}
			</label>
		)
	}

	if (as === 'span') {
		const span = attrs as IntrinsicElements['span']
		return (
			<span {...span} class={styles} data-slot="button-group-text">
				{children}
			</span>
		)
	}

	const div = attrs as IntrinsicElements['div']
	return (
		<div {...div} class={styles} data-slot="button-group-text">
			{children}
		</div>
	)
}

export {
	ButtonGroup,
	ButtonGroupSeparator,
	ButtonGroupText,
}
