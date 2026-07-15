import {
	VirtualList as BaseVirtualList,
	type VirtualListArgs as BaseVirtualListArgs,
	type VirtualListKey,
} from 'ajo-ui/virtual-list'
import { scrollAreaViewportVariants } from './internal/recipes'
import { ScrollAreaFrame } from './internal/scroll-area'

export type {
	VirtualListApi,
	VirtualListKey,
	VirtualListScrollOptions,
	VirtualListTarget,
} from 'ajo-ui/virtual-list'

/** Playa VirtualList args: `class`/`style` target its frame; other DOM args target the `ul`. */
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
	style,
	...attrs
}: VirtualListArgs<T, Key>) => (
	<ScrollAreaFrame class={classes} style={style}>
		<BaseVirtualList<T, Key>
			{...attrs}
			class={scrollAreaViewportVariants({ axis: 'y' })}
		/>
	</ScrollAreaFrame>
)

export { VirtualList }
export default VirtualList
