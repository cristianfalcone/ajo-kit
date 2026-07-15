import type { Stateless } from 'ajo'
import type { OmitArg } from 'ajo-ui/utils'
import clsx from 'clsx'
import {
	Tooltip as BaseTooltip,
	TooltipArrow as BaseTooltipArrow,
	TooltipContent as BaseTooltipContent,
	TooltipProvider as BaseTooltipProvider,
	type TooltipContentArgs as BaseTooltipContentArgs,
	type TooltipArgs,
	type TooltipArrowArgs,
	type TooltipProviderArgs,
} from 'ajo-ui/tooltip'
import { stlx } from 'ajo-ui/utils'
import { popupAnimation, popupSlide } from './internal/recipes'
export { TooltipTrigger } from 'ajo-ui/tooltip'
export type { TooltipAlign, TooltipArgs, TooltipArrowArgs, TooltipProviderArgs, TooltipSide, TooltipTriggerArgs } from 'ajo-ui/tooltip'

export type TooltipContentArgs = OmitArg<BaseTooltipContentArgs, 'class'> & {
	/** Additional UnoCSS classes. */
	class?: string
}

const rootBase = 'relative inline-block'
const contentBase = 'relative z-50 m-0 w-fit max-w-xs rounded-md bg-primary px-3 py-1.5 text-balance text-xs text-primary-foreground shadow-xs outline-none'
// The placer writes inline left/top pinned to the trigger; the theme only
// draws the rotated square matching the bubble surface.
const arrowBase = 'pointer-events-none absolute z-50 size-2.5 rotate-45 rounded-[2px] bg-primary'

/** Shared defaults for descendant Tooltip components. */
const TooltipProvider: Stateless<TooltipProviderArgs> = ({ class: classes, style, ...attrs }) => (
	<BaseTooltipProvider
		{...attrs}
		class={classes}
		style={stlx('display:contents', style)}
	/>
)

/** Root provider for one tooltip. */
const Tooltip: Stateless<TooltipArgs> = ({ class: classes, ...attrs }) => (
	<BaseTooltip {...attrs} class={clsx(rootBase, classes)} />
)

/**
 * Caret matching the tooltip bubble. TooltipContent already renders one;
 * composing a TooltipArrow manually replaces the auto caret cleanly — it
 * registers last, and its unmount hands the caret back to the auto one.
 */
const TooltipArrow: Stateless<TooltipArrowArgs> = ({ class: classes, ...attrs }) => (
	<BaseTooltipArrow {...attrs} class={clsx(arrowBase, classes)} />
)

/** Non-interactive text bubble shown for a TooltipTrigger. */
const TooltipContent: Stateless<TooltipContentArgs> = ({ children, class: classes, ...attrs }) => (
	<BaseTooltipContent
		{...attrs}
		class={clsx(contentBase, popupAnimation, popupSlide, classes)}
	>
		{/* Before children so a manually composed arrow registers last and wins. */}
		<TooltipArrow />
		{children}
	</BaseTooltipContent>
)

export {
	Tooltip,
	TooltipArrow,
	TooltipContent,
	TooltipProvider,
	}
