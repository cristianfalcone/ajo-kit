import type { Stateless } from 'ajo'
import { clx } from 'ajo-ui/utils'
import {
	DirectionProvider as BaseDirectionProvider,
	type DirectionProviderArgs as BaseDirectionProviderArgs,
} from 'ajo-ui/direction'
export type { Direction } from 'ajo-ui/direction'

export type DirectionProviderArgs = BaseDirectionProviderArgs & {
	/** Additional UnoCSS classes. */
	class?: string
}

/** Provider that sets an inherited HTML `dir` attribute on its subtree. */
const DirectionProvider: Stateless<DirectionProviderArgs> = ({
	children,
	class: classes,
	...attrs
}) => (
	<BaseDirectionProvider
		{...attrs}
		class={clx('contents', classes)}
	>
		{children}
	</BaseDirectionProvider>
)

export { DirectionProvider }
