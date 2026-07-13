import {
	VirtualList as BaseVirtualList,
	type VirtualListArgs as BaseVirtualListArgs,
	type VirtualListKey,
} from 'ajo-ui/virtual-list'
import { scrollAreaRootVariants } from './scroll-area'

export type {
	VirtualListApi,
	VirtualListKey,
	VirtualListScrollOptions,
	VirtualListTarget,
} from 'ajo-ui/virtual-list'

/** Playa VirtualList arguments with the theme's string class contract. */
export type VirtualListArgs<
	T = unknown,
	Key extends VirtualListKey = VirtualListKey,
> = BaseVirtualListArgs<T, Key> & { class?: string }

/** Playa-styled vertical virtual list. */
const VirtualList = <
	T,
	Key extends VirtualListKey = VirtualListKey,
>({
	class: classes,
	...attrs
}: VirtualListArgs<T, Key>) => (
	<BaseVirtualList<T, Key>
		{...attrs}
		class={scrollAreaRootVariants({ axis: 'y', class: classes })}
	/>
)

export { VirtualList }
export default VirtualList
