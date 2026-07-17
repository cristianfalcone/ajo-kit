import type { Stateless } from 'ajo'
import clsx from 'clsx'
import {
	Popover as BasePopover,
	PopoverContent as BasePopoverContent,
	type PopoverArgs,
	type PopoverContentArgs,
} from 'ajo-ui/popover'
import { popupAnimation, popupContent, popupSlide } from './internal/recipes'
export { PopoverAnchor, PopoverTrigger } from 'ajo-ui/popover'
export type { PopoverAnchorArgs, PopoverArgs, PopoverContentArgs, PopoverOpenOn, PopoverTriggerArgs } from 'ajo-ui/popover'
export type { PopupPlacement, PopupPosition } from 'ajo-ui/utils'

const rootBase = 'inline-block'
const contentBase = 'playa-popover-content z-50 w-72 [--popup-radius:calc(var(--radius)+0.25rem)] rounded-[var(--popup-radius)] p-4 outline-none [&>[data-slot=popover-header]]:flex [&>[data-slot=popover-header]]:flex-col [&>[data-slot=popover-header]]:gap-1 [&>[data-slot=popover-header]]:text-sm [&_[data-slot=popover-title]]:font-medium [&_[data-slot=popover-description]]:text-muted-foreground'

/** Root provider for a popover. */
const Popover: Stateless<PopoverArgs> = ({ class: classes, ...attrs }) => (
	<BasePopover {...attrs} class={clsx(rootBase, classes)} />
)

/** Floating rich-content panel for a Popover. */
const PopoverContent: Stateless<PopoverContentArgs> = ({ class: classes, ...attrs }) => (
	<BasePopoverContent {...attrs} class={clsx(popupContent, contentBase, popupAnimation, popupSlide, classes)} />
)

export {
	Popover,
	PopoverContent,
}
