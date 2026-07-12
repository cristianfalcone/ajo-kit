import type { Stateless } from 'ajo'
import clsx from 'clsx'
import {
	ResizableHandle as BaseResizableHandle,
	ResizablePanel as BaseResizablePanel,
	ResizablePanelGroup as BaseResizablePanelGroup,
	useResizable as baseUseResizable,
	type ResizableHandleArgs as BaseResizableHandleArgs,
	type ResizableOrientation as BaseResizableOrientation,
	type ResizablePanelArgs as BaseResizablePanelArgs,
	type ResizablePanelGroupArgs as BaseResizablePanelGroupArgs,
	type ResizableSize as BaseResizableSize,
} from 'ajo-ui/resizable'

export type ResizableOrientation = BaseResizableOrientation
export type ResizableSize = BaseResizableSize

export type ResizablePanelGroupArgs = BaseResizablePanelGroupArgs & {
	/** Additional UnoCSS classes. */
	class?: string
}

export type ResizablePanelArgs = BaseResizablePanelArgs & {
	/** Additional UnoCSS classes. */
	class?: string
}

export type ResizableHandleArgs = BaseResizableHandleArgs & {
	/** Show the small grip marker inside the handle. */
	withHandle?: boolean
	/** Additional UnoCSS classes. */
	class?: string
}

const groupBase = 'flex h-full w-full overflow-hidden'
const panelBase = 'min-h-0 min-w-0 overflow-hidden'
const handleBase = 'relative flex touch-none shrink-0 items-center justify-center bg-border outline-none focus-visible:ring-3 focus-visible:ring-ring/50'

/** Resizable panel group for split layouts. */
const ResizablePanelGroup: Stateless<ResizablePanelGroupArgs> = ({
	children,
	class: classes,
	orientation = 'horizontal',
	...attrs
}) => (
	<BaseResizablePanelGroup
		{...attrs}
		class={clsx(groupBase, orientation === 'vertical' && 'flex-col', classes)}
		orientation={orientation}
	>
		{children}
	</BaseResizablePanelGroup>
)

/** Resizable flex panel. */
const ResizablePanel: Stateless<ResizablePanelArgs> = ({
	children,
	class: classes,
	defaultSize,
	maxSize,
	minSize,
	style,
	...attrs
}) => (
	<BaseResizablePanel
		{...attrs}
		class={clsx(panelBase, classes)}
		defaultSize={defaultSize}
		maxSize={maxSize}
		minSize={minSize}
		style={style}
	>
		{children}
	</BaseResizablePanel>
)

/** Resize separator between adjacent panels. */
const ResizableHandle: Stateless<ResizableHandleArgs> = ({
	children,
	class: classes,
	disabled,
	withHandle,
	...attrs
}) => {
	const { orientation } = baseUseResizable()
	const vertical = orientation === 'vertical'

	return (
		<BaseResizableHandle
			{...attrs}
			class={clsx(
				handleBase,
				vertical
					? 'h-px w-full cursor-row-resize after:absolute after:left-0 after:top-1/2 after:h-3 after:w-full after:-translate-y-1/2'
					: 'h-full w-px cursor-col-resize after:absolute after:inset-y-0 after:left-1/2 after:w-3 after:-translate-x-1/2',
				disabled && 'pointer-events-none opacity-50',
				classes,
			)}
			disabled={disabled}
		>
			{withHandle && (
				<div class={clsx('z-10 flex h-4 w-3 items-center justify-center rounded-xs edge bg-border', vertical && 'rotate-90')}>
					<span class="i-lucide-grip-vertical size-2.5" />
				</div>
			)}
			{children}
		</BaseResizableHandle>
	)
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup }
