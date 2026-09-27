import type { Stateless } from 'ajo'
import { clx } from 'ajo-ui/utils'
import { ContextMenu as BaseContextMenu, type ContextMenuArgs } from 'ajo-ui/context-menu'
export { ContextMenuTrigger } from 'ajo-ui/context-menu'
export type { ContextMenuArgs, ContextMenuTriggerArgs } from 'ajo-ui/context-menu'

/** Root provider for a context menu; compose the Playa Menu parts inside it. */
const ContextMenu: Stateless<ContextMenuArgs> = ({ class: classes, ...attrs }) => (
	<BaseContextMenu
		{...attrs}
		class={clx('contents', classes)}
	/>
)

export { ContextMenu }
