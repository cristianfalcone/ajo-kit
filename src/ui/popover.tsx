import type { Stateless } from 'ajo'
import clsx from 'clsx'
import {
	Popover as BasePopover,
	PopoverArrow as BasePopoverArrow,
	PopoverContent as BasePopoverContent,
	PopoverDescription as BasePopoverDescription,
	PopoverHeader as BasePopoverHeader,
	PopoverTitle as BasePopoverTitle,
	type PopoverArgs,
	type PopoverArrowArgs,
	type PopoverContentArgs,
	type PopoverDescriptionArgs,
	type PopoverHeaderArgs,
	type PopoverTitleArgs,
} from 'ajo-ui/popover'
import { popupAnimation, popupSlide } from './menu'
export { PopoverAnchor, PopoverTrigger } from 'ajo-ui/popover'
export type { PopoverAlign, PopoverAnchorArgs, PopoverArgs, PopoverArrowArgs, PopoverContentArgs, PopoverDescriptionArgs, PopoverHeaderArgs, PopoverOpenOn, PopoverSide, PopoverTitleArgs, PopoverTriggerArgs } from 'ajo-ui/popover'

const rootBase = 'relative inline-block'
const contentBase = 'z-50 m-0 w-72 rounded-lg glass-overlay edge p-4 shadow-lg outline-none'
// The placer writes inline left/top; the theme only rotates the square and
// borders its two outward faces per the content's live data-side.
const arrowBase = [
	'pointer-events-none absolute z-50 size-2.5 rotate-45 glass-overlay border-border',
	'[[data-side=top]>&]:border-b [[data-side=top]>&]:border-r',
	'[[data-side=bottom]>&]:border-t [[data-side=bottom]>&]:border-l',
	'[[data-side=left]>&]:border-t [[data-side=left]>&]:border-r',
	'[[data-side=right]>&]:border-b [[data-side=right]>&]:border-l',
].join(' ')

/** Root provider for a popover. */
const Popover: Stateless<PopoverArgs> = ({ class: classes, ...attrs }) => (
	<BasePopover {...attrs} class={clsx(rootBase, classes)} />
)

/** Floating rich-content panel for a Popover. */
const PopoverContent: Stateless<PopoverContentArgs> = ({ class: classes, ...attrs }) => (
	<BasePopoverContent {...attrs} class={clsx(contentBase, popupAnimation, popupSlide, classes)} />
)

/** Caret matching the popover surface; render inside PopoverContent. */
const PopoverArrow: Stateless<PopoverArrowArgs> = ({ class: classes, ...attrs }) => (
	<BasePopoverArrow {...attrs} class={clsx(arrowBase, classes)} />
)

/** Header group for PopoverTitle and PopoverDescription. */
const PopoverHeader: Stateless<PopoverHeaderArgs> = ({ class: classes, ...attrs }) => (
	<BasePopoverHeader {...attrs} class={clsx('flex flex-col gap-1 text-sm', classes)} />
)

/** Accessible title for PopoverContent. */
const PopoverTitle: Stateless<PopoverTitleArgs> = ({ class: classes, ...attrs }) => (
	<BasePopoverTitle {...attrs} class={clsx('font-medium', classes)} />
)

/** Supporting copy for PopoverContent. */
const PopoverDescription: Stateless<PopoverDescriptionArgs> = ({ class: classes, ...attrs }) => (
	<BasePopoverDescription {...attrs} class={clsx('text-muted-foreground', classes)} />
)

export {
	Popover,
	PopoverArrow,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
}
