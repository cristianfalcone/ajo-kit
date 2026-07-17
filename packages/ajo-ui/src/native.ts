/** HTMLElement shape augmented by the native Popover API. */
export type PopoverElement = HTMLElement & {
	hidePopover?: () => void
	showPopover?: (options?: { source?: HTMLElement }) => void
}

/** Checks whether a native popover is currently open. */
export const popoverOpen = (element: HTMLElement) =>
	typeof element.matches === 'function' && element.matches(':popover-open')

/** Opens a native popover and reports whether it is open. */
export const openPopover = (element: PopoverElement, source?: HTMLElement | null) => {
	if (popoverOpen(element)) return true
	if (typeof element.showPopover !== 'function') return false
	if (source) element.showPopover({ source })
	else element.showPopover()
	return popoverOpen(element)
}

/** Closes a native popover and reports whether it is closed. */
export const closePopover = (element: PopoverElement) => {
	if (!popoverOpen(element)) return true
	if (typeof element.hidePopover !== 'function') return false
	element.hidePopover()
	return !popoverOpen(element)
}
