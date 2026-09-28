import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import { clx } from 'ajo-ui/utils'

export type KbdArgs = WithChildren<IntrinsicElements['kbd']>
export type KbdGroupArgs = WithChildren<IntrinsicElements['kbd']>

// A key is data a person reads and types, so it takes the data face. On the
// tooltip's carpet its muted fill and text resolve in the carpet's dark scheme.
const keyBase = 'pointer-events-none inline-flex h-5 w-fit min-w-5 select-none items-center justify-center gap-1 rounded-xs edge bg-muted px-1 font-mono text-xs font-medium text-muted-foreground [&_svg:not([class*=size-])]:size-3'
const groupBase = 'inline-flex items-center gap-1'

/** Semantic keyboard key marker. */
const Kbd: Stateless<KbdArgs> = ({ children, class: classes, ...attrs }) => (
	<kbd {...attrs} class={clx(keyBase, classes)} data-slot="kbd">
		{children}
	</kbd>
)

/** Semantic keyboard shortcut group. */
const KbdGroup: Stateless<KbdGroupArgs> = ({ children, class: classes, ...attrs }) => (
	<kbd {...attrs} class={clx(groupBase, classes)} data-slot="kbd-group">
		{children}
	</kbd>
)

export { Kbd, KbdGroup }
