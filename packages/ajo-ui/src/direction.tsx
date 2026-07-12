import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import type { OmitArg } from './utils'
import { statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'

export type Direction = 'ltr' | 'rtl'

export type DirectionProviderArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'dir'> & {
	/** Text direction. */
	dir?: Direction
}>

const DirectionContext = context<Direction>('ltr')

/** Read the nearest direction provider value. */
const useDirection = () => DirectionContext()

type DirectionRootArgs = WithChildren<{
	dir: Direction
}>

const DirectionRoot: Stateful<DirectionRootArgs> = function* () {
	for (const { children, dir } of this) {
		DirectionContext(dir)
		yield <>{children}</>
	}
}

/** Unstyled provider that sets direction context and an inherited HTML `dir` attribute. */
const DirectionProvider: Stateless<DirectionProviderArgs> = ({
	children,
	dir = 'ltr',
	...attrs
}) => (
	<DirectionRoot
		{...rootAttrs(attrs)}
		dir={dir}
		attr:data-slot="direction-provider"
		attr:dir={dir}
	>
		{children}
	</DirectionRoot>
)

export { DirectionProvider, useDirection }
