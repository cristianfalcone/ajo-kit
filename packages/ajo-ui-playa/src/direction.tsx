import type { Stateless } from 'ajo'
import clsx from 'clsx'
import {
	DirectionContext,
	DirectionProvider as BaseDirectionProvider,
	type DirectionProviderArgs as BaseDirectionProviderArgs,
} from 'ajo-ui/direction'
export type { Direction } from 'ajo-ui/direction'

export type DirectionProviderArgs = BaseDirectionProviderArgs & {
	/** Additional UnoCSS classes. */
	class?: string
}

/** Provider that sets Ajo direction context and an inherited HTML `dir` attribute. */
const DirectionProvider: Stateless<DirectionProviderArgs> = ({
	children,
	class: classes,
	...attrs
}) => (
	<BaseDirectionProvider
		{...attrs}
		class={clsx('contents', classes)}
	>
		{children}
	</BaseDirectionProvider>
)

export { DirectionContext, DirectionProvider }
