import type { Stateless } from 'ajo'
import clsx from 'clsx'
import {
	DirectionProvider as BaseDirectionProvider,
	type DirectionProviderArgs as BaseDirectionProviderArgs,
	useDirection as baseUseDirection,
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

export { DirectionProvider, baseUseDirection as useDirection }
