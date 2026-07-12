import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'

export type KbdArgs = WithChildren<IntrinsicElements['kbd']>
export type KbdGroupArgs = WithChildren<IntrinsicElements['kbd']>

const keyBase = 'pointer-events-none inline-flex h-5 w-fit min-w-5 select-none items-center justify-center gap-1 rounded-sm edge bg-muted px-1 font-sans text-xs font-medium text-muted-foreground [&_svg:not([class*=size-])]:size-3 [[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background'
const groupBase = 'inline-flex items-center gap-1'

/** Semantic keyboard key marker. */
const Kbd: Stateless<KbdArgs> = ({ children, class: classes, ...attrs }) => (
	<kbd {...attrs} class={clsx(keyBase, classes)} data-slot="kbd">
		{children}
	</kbd>
)

/** Semantic keyboard shortcut group. */
const KbdGroup: Stateless<KbdGroupArgs> = ({ children, class: classes, ...attrs }) => (
	<kbd {...attrs} class={clsx(groupBase, classes)} data-slot="kbd-group">
		{children}
	</kbd>
)

export { Kbd, KbdGroup }
