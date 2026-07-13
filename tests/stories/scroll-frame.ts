const frameOf = (viewport: HTMLElement, owner: string) => {
	const frame = viewport.parentElement
	if (frame?.dataset.slot !== 'scroll-area-frame') throw new Error(`${owner} is missing the shared ScrollArea frame`)
	return frame
}

export const assertScrollFrame = (viewport: HTMLElement, owner: string) => {
	const frame = frameOf(viewport, owner)
	if (getComputedStyle(frame).overflow !== 'hidden') throw new Error(`${owner} frame must contain scrollbar paint`)
	if (frame.children.length !== 1 || frame.firstElementChild !== viewport) {
		throw new Error(`${owner} frame must contain only its viewport`)
	}
	if (frame.scrollHeight !== frame.clientHeight || frame.scrollWidth !== frame.clientWidth) {
		throw new Error(`${owner} frame must not own a scroll range`)
	}
	for (const token of ['scrollbar-soft', 'scrollbar-framed']) {
		if (!viewport.classList.contains(token)) throw new Error(`${owner} viewport is missing ${token}`)
	}
	const frameRadius = getComputedStyle(frame).borderRadius
	const viewportRadius = getComputedStyle(viewport).borderRadius
	if (frameRadius === '0px' || frameRadius !== viewportRadius) {
		throw new Error(`${owner} frame radius does not contain its viewport: ${frameRadius}/${viewportRadius}`)
	}

	const scrollbar = getComputedStyle(viewport, '::-webkit-scrollbar')
	const thumb = getComputedStyle(viewport, '::-webkit-scrollbar-thumb')
	const contract = [scrollbar.width, scrollbar.height, thumb.borderTopWidth, thumb.backgroundClip].join('/')
	if (contract !== '10px/10px/0px/border-box') {
		throw new Error(`${owner} shared scrollbar contract changed: ${contract}`)
	}
}

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

export const assertScrollFrameFocus = async (viewport: HTMLElement, owner: string) => {
	const frame = frameOf(viewport, owner)
	const restingShadow = getComputedStyle(frame).boxShadow
	viewport.focus()
	await nextFrame()
	await nextFrame()
	if (document.activeElement !== viewport || !viewport.matches(':focus-visible')) {
		throw new Error(`${owner} viewport did not retain visible focus`)
	}
	if (!frame.matches(':has(>:focus-visible)') || getComputedStyle(frame).boxShadow === restingShadow) {
		throw new Error(`${owner} frame did not paint viewport focus`)
	}
	viewport.blur()
}
