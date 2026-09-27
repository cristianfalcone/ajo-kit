import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import type { OmitArg } from './utils'
import { rootAttrs } from './shared'

/** Logical text direction read by direction-aware components. */
export type Direction = 'ltr' | 'rtl'

/** Arguments for a host that sets an inherited HTML `dir` on its subtree. */
export type DirectionProviderArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'dir'> & {
	/** Text direction. */
	dir?: Direction
}>

const DirectionRoot: Stateful<DirectionProviderArgs> = function* () {
	for (const { children } of this) yield children
}

/**
 * Unstyled host that writes an inherited HTML `dir` on its subtree. Components
 * read the resolved direction from the DOM, so a document-level `dir` works alone.
 */
const DirectionProvider: Stateless<DirectionProviderArgs> = ({ dir = 'ltr', ...args }) => (
	<DirectionRoot
		{...rootAttrs(args)}
		attr:data-slot="direction-provider"
		attr:dir={dir}
	/>
)

export { DirectionProvider }
