import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import type { OmitArg } from './utils'
import { context } from 'ajo/context'
import { rootAttrs } from './shared'

/** Logical text direction inherited by direction-aware components. */
export type Direction = 'ltr' | 'rtl'

/** Arguments for a provider that owns direction context and the host `dir`. */
export type DirectionProviderArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'dir'> & {
	/** Text direction. */
	dir?: Direction
}>

/** Direction inherited by direction-aware components. */
export const DirectionContext = context<Direction>('ltr')

type DirectionRootArgs = DirectionProviderArgs & Required<Pick<DirectionProviderArgs, 'dir'>>

const DirectionRoot: Stateful<DirectionRootArgs> = function* () {
	for (const { children, dir } of this) {
		DirectionContext(dir)
		yield <>{children}</>
	}
}

/** Unstyled provider that sets direction context and an inherited HTML `dir` attribute. */
const DirectionProvider: Stateless<DirectionProviderArgs> = ({ dir = 'ltr', ...args }) => (
	<DirectionRoot
		{...rootAttrs(args)}
		dir={dir}
		attr:data-slot="direction-provider"
		attr:dir={dir}
	/>
)

export { DirectionProvider }
