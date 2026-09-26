/** HTMLElement shape augmented by the native Popover API. */
export type PopoverElement = HTMLElement & {
	hidePopover?: () => void
	showPopover?: (options?: { source?: HTMLElement }) => void
}

/** Checks whether a native popover is currently open. */
export const popoverOpen = (element: HTMLElement) =>
	typeof element.matches === 'function' && element.matches(':popover-open')

/** Opens a native popover; a no-op where the Popover API is missing. */
export const openPopover = (element: PopoverElement, source?: HTMLElement | null) => {
	if (popoverOpen(element) || typeof element.showPopover !== 'function') return
	if (source) element.showPopover({ source })
	else element.showPopover()
}

/** Closes a native popover when it is open. */
export const closePopover = (element: PopoverElement) => {
	if (popoverOpen(element)) element.hidePopover!()
}
