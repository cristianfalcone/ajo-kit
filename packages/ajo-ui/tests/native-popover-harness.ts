const restore = (name: 'hidePopover' | 'matches' | 'showPopover', descriptor?: PropertyDescriptor) => {
	if (descriptor) Object.defineProperty(HTMLElement.prototype, name, descriptor)
	else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[name]
}

/** Installs the native Popover state that happy-dom does not implement. */
export const nativePopoverHarness = () => {
	const open = new WeakSet<HTMLElement>()
	const matches = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'matches')
	const show = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
	const hide = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'hidePopover')
	const nativeMatches = HTMLElement.prototype.matches

	return {
		install() {
			Object.defineProperty(HTMLElement.prototype, 'matches', {
				configurable: true,
				writable: true,
				value(this: HTMLElement, selector: string) {
					return selector === ':popover-open' ? open.has(this) : nativeMatches.call(this, selector)
				},
			})
			Object.defineProperty(HTMLElement.prototype, 'showPopover', {
				configurable: true,
				value(this: HTMLElement) { open.add(this) },
			})
			Object.defineProperty(HTMLElement.prototype, 'hidePopover', {
				configurable: true,
				value(this: HTMLElement) { open.delete(this) },
			})
		},
		restore() {
			restore('matches', matches)
			restore('showPopover', show)
			restore('hidePopover', hide)
		},
	}
}
