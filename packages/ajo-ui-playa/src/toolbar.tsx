import type { Stateless } from 'ajo'
import { clx } from 'ajo-ui/utils'
import {
	Toolbar as BaseToolbar,
	ToolbarSeparator as BaseToolbarSeparator,
} from 'ajo-ui/toolbar'
import type { ToolbarArgs as BaseToolbarArgs, ToolbarOrientation, ToolbarSeparatorArgs } from 'ajo-ui/toolbar'

export type { ToolbarOrientation, ToolbarSeparatorArgs }

/** Control height a toolbar passes to the controls inside it. */
export type ToolbarSize = 'default' | 'lg' | 'sm'

export type ToolbarArgs = BaseToolbarArgs & {
	/** Height of every control inside: a default-size child takes it, an explicitly sized one keeps its own. */
	size?: ToolbarSize
}

// rounded-lg keeps the track concentric with its rounded-md children:
// its 16px corners minus 4px padding meet their 12px corners exactly.
const rootBase = 'flex w-fit items-center gap-1 rounded-lg edge p-1 playa-control-size playa-toolbar-summary data-[orientation=vertical]:flex-col'
const separatorBase = 'shrink-0 self-stretch bg-border data-[orientation=vertical]:mx-1 data-[orientation=vertical]:w-px data-[orientation=horizontal]:my-1 data-[orientation=horizontal]:h-px'

/** Toolbar grouping buttons, toggle groups, and inputs behind a single Tab stop with arrow-key roving. */
const Toolbar: Stateless<ToolbarArgs> = ({ class: classes, size = 'default', ...attrs }) => (
	<BaseToolbar {...attrs} class={clx(rootBase, classes)} data-size={size} />
)

/** Visual separator between toolbar groups. */
const ToolbarSeparator: Stateless<ToolbarSeparatorArgs> = ({ class: classes, ...attrs }) => (
	<BaseToolbarSeparator {...attrs} class={clx(separatorBase, classes)} />
)

export { Toolbar, ToolbarSeparator }
