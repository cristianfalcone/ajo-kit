import type { Stateless } from 'ajo'
import type { OmitArg } from 'ajo-ui/utils'
import clsx from 'clsx'
import {
	Tooltip as BaseTooltip,
	TooltipContent as BaseTooltipContent,
	TooltipProvider as BaseTooltipProvider,
	type TooltipContentArgs as BaseTooltipContentArgs,
	type TooltipArgs,
	type TooltipProviderArgs,
} from 'ajo-ui/tooltip'
import { stlx } from 'ajo-ui/utils'
import { popupAnimation, popupContent, popupSlide } from './internal/recipes'
export { TooltipTrigger } from 'ajo-ui/tooltip'
export type { PopupPlacement, PopupPosition, TooltipArgs, TooltipProviderArgs, TooltipTriggerArgs } from 'ajo-ui/tooltip'

export type TooltipContentArgs = OmitArg<BaseTooltipContentArgs, 'class'> & {
	/** Additional UnoCSS classes. */
	class?: string
}

const rootBase = 'inline-block'
const contentBase = 'playa-tooltip-content z-50 w-fit max-w-xs [--popup-radius:var(--radius)] rounded-[var(--popup-radius)] px-3 py-1.5 text-balance text-xs outline-none'

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

/** Non-interactive text bubble shown for a TooltipTrigger. */
const TooltipContent: Stateless<TooltipContentArgs> = ({ class: classes, ...attrs }) => (
	<BaseTooltipContent
		{...attrs}
		class={clsx(popupContent, contentBase, popupAnimation, popupSlide, classes)}
	/>
)

export {
	Tooltip,
	TooltipContent,
	TooltipProvider,
}
