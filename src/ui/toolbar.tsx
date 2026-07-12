import type { Stateless } from 'ajo'
import clsx from 'clsx'
import {
	Toolbar as BaseToolbar,
	ToolbarSeparator as BaseToolbarSeparator,
} from 'ajo-ui/toolbar'
import type { ToolbarArgs, ToolbarOrientation, ToolbarSeparatorArgs } from 'ajo-ui/toolbar'

export type { ToolbarArgs, ToolbarOrientation, ToolbarSeparatorArgs }

const rootBase = 'flex w-fit items-center gap-1 rounded-md edge p-1 data-[orientation=vertical]:flex-col'
const separatorBase = 'shrink-0 self-stretch bg-border data-[orientation=vertical]:mx-1 data-[orientation=vertical]:w-px data-[orientation=horizontal]:my-1 data-[orientation=horizontal]:h-px'

/** Toolbar grouping buttons, toggle groups, and inputs behind a single tab stop with arrow-key roving. */
const Toolbar: Stateless<ToolbarArgs> = ({ class: classes, ...attrs }) => (
	<BaseToolbar {...attrs} class={clsx(rootBase, classes)} />
)

/** Visual separator between toolbar groups. */
const ToolbarSeparator: Stateless<ToolbarSeparatorArgs> = ({ class: classes, ...attrs }) => (
	<BaseToolbarSeparator {...attrs} class={clsx(separatorBase, classes)} />
)

export { Toolbar, ToolbarSeparator }
