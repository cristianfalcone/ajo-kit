/** Resolves after `count` animation frames. */
export const frame = async (count = 1) => {
	for (let index = 0; index < count; index++) await new Promise(resolve => requestAnimationFrame(resolve))
}

/** Resolves after `ms` milliseconds. */
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/** Checks once per frame until `check` passes; throws `message` (default: the check's source) after `timeout` milliseconds. */
export const until = async (check: () => boolean, message = `Timed out waiting for ${check}`, timeout = 3000) => {
	const deadline = performance.now() + timeout
	while (!check()) {
		if (performance.now() > deadline) throw new Error(message)
		await frame()
	}
}

/** Dispatches a cancelable keydown; returns false when a handler called preventDefault. */
export const press = (element: HTMLElement, key: string, init: KeyboardEventInit = {}) =>
	element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, ...init }))

const tokens = (value: string | null) => new Set((value ?? '').split(/\s+/).filter(Boolean))

/** Asserts the Field wiring of the control with `data-slot={slot}` inside `[data-story-field={name}]`. */
export const assertFieldControl = (canvas: HTMLElement, name: string, slot: string, id?: string) => {
	const field = canvas.querySelector<HTMLElement>(`[data-story-field="${name}"]`)
	const label = field?.querySelector<HTMLLabelElement>('[data-slot="field-label"]')
	const description = field?.querySelector<HTMLElement>('[data-slot="field-description"]')
	const error = field?.querySelector<HTMLElement>('[data-slot="field-error"]')
	const control = field?.querySelector<HTMLElement>(`[data-slot="${slot}"]`)
	if (!field || !label || !description || !error || !control) throw new Error(`${slot} field wiring story did not render ${name}`)

	const labelFor = label.getAttribute('for')
	if (!labelFor || control.id !== labelFor) throw new Error(`${slot} ${name} id did not match its label for attribute`)
	if (id && control.id !== id) throw new Error(`${slot} ${name} did not keep its manual id`)

	const describedby = tokens(control.getAttribute('aria-describedby'))
	if (!describedby.has(description.id) || !describedby.has(error.id)) {
		throw new Error(`${slot} ${name} aria-describedby did not include description and error ids`)
	}
	if (control.getAttribute('aria-invalid') !== 'true') throw new Error(`${slot} ${name} did not receive aria-invalid`)
	if (control.getAttribute('aria-errormessage') !== error.id) throw new Error(`${slot} ${name} did not receive aria-errormessage`)
}

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

export const assertScrollFrameFocus = async (viewport: HTMLElement, owner: string) => {
	const scrollFrame = frameOf(viewport, owner)
	const restingShadow = getComputedStyle(scrollFrame).boxShadow
	viewport.focus()
	await frame(2)
	if (document.activeElement !== viewport || !viewport.matches(':focus-visible')) {
		throw new Error(`${owner} viewport did not retain visible focus`)
	}
	if (!scrollFrame.matches(':has(>:focus-visible)') || getComputedStyle(scrollFrame).boxShadow === restingShadow) {
		throw new Error(`${owner} frame did not paint viewport focus`)
	}
	viewport.blur()
}
