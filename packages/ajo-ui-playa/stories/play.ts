import type { Check } from './app'

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

/**
 * Asserts that a focused scroll viewport shows the one focus ring inside its
 * box, where the frame's clip keeps it, and that the frame adds no halo.
 */
export const assertScrollFrameFocus = async (viewport: HTMLElement, owner: string) => {
	const scrollFrame = frameOf(viewport, owner)
	const restingShadow = getComputedStyle(scrollFrame).boxShadow
	viewport.focus()
	await frame(2)
	if (document.activeElement !== viewport || !viewport.matches(':focus-visible')) {
		throw new Error(`${owner} viewport did not retain visible focus`)
	}
	const { outlineOffset, outlineStyle, outlineWidth } = getComputedStyle(viewport)
	const width = Number.parseFloat(outlineWidth)
	if (outlineStyle === 'none' || !width || Number.parseFloat(outlineOffset) !== -width) {
		throw new Error(`${owner} viewport does not ring inside its box: ${outlineStyle} ${outlineWidth} at ${outlineOffset}`)
	}
	if (getComputedStyle(scrollFrame).boxShadow !== restingShadow) throw new Error(`${owner} frame adds a focus halo`)
	viewport.blur()
}

/** The element as a tag, its slot and its accessible name or text, for failure messages. */
const describe = (element: Element) => {
	const slot = element.getAttribute('data-slot')
	const name = element.getAttribute('aria-label') ?? element.textContent?.trim().slice(0, 40)
	return `${element.localName}${slot ? `[data-slot=${slot}]` : ''}${name ? ` "${name}"` : ''}`
}

const interactive = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex]:not([tabindex="-1"]), [role="button"], [role="checkbox"], [role="combobox"], [role="link"], [role="menuitem"], [role="option"], [role="radio"], [role="slider"], [role="switch"], [role="tab"]'

/** The interactive elements in `root` that render: laid out, not hidden, not transparent. */
const shown = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>(interactive)].filter(element => {
	const style = getComputedStyle(element)
	const rect = element.getBoundingClientRect()
	return rect.width > 1 && rect.height > 1 && style.visibility !== 'hidden' && Number(style.opacity) > 0
})

/** A failure of a named screens check: the runner files it under `check`, one element per message line. */
export class CheckError extends Error {
	constructor(readonly check: Check, lines: string[]) {
		super(lines.join('\n'))
	}
}

const spread = (values: number[]) => Math.max(...values) - Math.min(...values)
const overlap = (a: DOMRect, b: DOMRect) => Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)

/**
 * Asserts that the fields of every FieldRow that share a line keep their
 * controls aligned: one centre for every control, and one top and one height
 * for full-height controls (30 px or taller, provisional until `--control-sm`
 * exists; a checkbox or switch only shares the centre), whether or not a
 * neighbour has help, an error or a wrapped label. A line is the fields whose
 * boxes overlap vertically, not the ones that share a top: subgrid gives the
 * fields of a line one top, but a field pushed down on its own still overlaps
 * its neighbours and must be compared with them. A stacked row has nothing to
 * compare and a wrapped row is checked line by line.
 */
export const assertRowAligned = (canvas: HTMLElement) => {
	const rows = [...canvas.querySelectorAll<HTMLElement>('[data-slot="field-row"]')]
	if (!rows.length) throw new Error('No FieldRow rendered')
	const lines: string[] = []
	for (const row of rows) {
		const fields: HTMLElement[][] = []
		for (const field of row.querySelectorAll<HTMLElement>(':scope > [data-slot="field"]')) {
			const rect = field.getBoundingClientRect()
			const line = fields.find(line => line.some(other => overlap(other.getBoundingClientRect(), rect) > 0.5))
			if (line) line.push(field)
			else fields.push([field])
		}
		for (const line of fields) {
			if (line.length < 2) continue
			const controls = line.flatMap(field => [...field.querySelectorAll<HTMLElement>(':scope > :not([data-slot^="field-"])')])
				.map(control => ({ control, rect: control.getBoundingClientRect() }))
			const names = controls.map(({ control }) => describe(control)).join(', ')
			const centres = controls.map(({ rect }) => rect.top + rect.height / 2)
			const tall = controls.filter(({ rect }) => rect.height >= 30).map(({ rect }) => rect)
			if (spread(centres) > 0.5) lines.push(`FieldRow controls do not share a centre: ${names} at ${centres.join(', ')}`)
			else if (spread(tall.map(rect => rect.top)) > 0.5 || spread(tall.map(rect => rect.height)) > 0.5) {
				lines.push(`FieldRow controls differ in top or height: ${names} at ${tall.map(rect => `${rect.top}/${rect.height}`).join(', ')}`)
			}
		}
	}
	if (lines.length) throw new CheckError('row', lines)
}

const box = (rect: DOMRect) => `${rect.left},${rect.top} ${rect.width}x${rect.height}`
const moved = (a: DOMRect, b: DOMRect) =>
	Math.max(Math.abs(a.left - b.left), Math.abs(a.top - b.top), Math.abs(a.width - b.width), Math.abs(a.height - b.height)) > 0.5

/** Runs `change` and asserts that no visible interactive element in `canvas` moved or resized across it. */
export const assertStill = async (canvas: HTMLElement, change: () => void | Promise<void>) => {
	const before = new Map(shown(canvas).map(element => [element, element.getBoundingClientRect()]))
	if (!before.size) throw new Error('No interactive element rendered')
	await change()
	await frame(2)
	const lines: string[] = []
	for (const element of shown(canvas)) {
		const rect = before.get(element)
		if (!rect) continue
		const next = element.getBoundingClientRect()
		if (moved(rect, next)) lines.push(`${describe(element)} moved from ${box(rect)} to ${box(next)}`)
	}
	if (lines.length) throw new CheckError('still', lines)
}

type Rgba = [number, number, number, number]

let paint: CanvasRenderingContext2D | undefined

/**
 * Any computed CSS colour as sRGB 0 to 255 with alpha 0 to 1, through a canvas.
 * A canvas keeps its previous fill for a colour it cannot parse, so two
 * different sentinels that both survive the assignment mean it was rejected.
 */
const rgba = (color: string): Rgba => {
	paint ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
	const rejected = ['#010203', '#040506'].every(sentinel => {
		paint!.fillStyle = sentinel
		paint!.fillStyle = color
		return paint!.fillStyle === sentinel
	})
	if (rejected) throw new Error(`The canvas cannot read the colour ${color}`)
	paint.clearRect(0, 0, 1, 1)
	paint.fillRect(0, 0, 1, 1)
	const [r, g, b, a] = paint.getImageData(0, 0, 1, 1).data
	return [r, g, b, a / 255]
}

const over = ([r, g, b, a]: Rgba, [br, bg, bb]: Rgba): Rgba =>
	[r * a + br * (1 - a), g * a + bg * (1 - a), b * a + bb * (1 - a), 1]

const luminance = ([r, g, b]: Rgba) => {
	const linear = (value: number) => {
		const channel = value / 255
		return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
	}
	return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

const contrast = (a: Rgba, b: Rgba) => {
	const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
	return (light + 0.05) / (dark + 0.05)
}

/** The opaque colour an element paints on: its own and its ancestors' background colours, composed. */
const surface = (element: Element | null): Rgba => {
	const layers: Rgba[] = []
	for (let node = element; node; node = node.parentElement) {
		const color = rgba(getComputedStyle(node).backgroundColor)
		if (color[3] > 0) layers.push(color)
		if (color[3] >= 1) break
	}
	return layers.reduceRight<Rgba>((below, layer) => over(layer, below), [255, 255, 255, 1])
}

/** Splits `value` at the characters `separator` matches outside parentheses, however deeply nested. */
const split = (value: string, separator: RegExp) => {
	const parts: string[] = []
	let depth = 0
	let start = 0
	for (let index = 0; index < value.length; index++) {
		const char = value[index]
		if (char === '(') depth++
		else if (char === ')') depth--
		else if (!depth && separator.test(char)) {
			parts.push(value.slice(start, index))
			start = index + 1
		}
	}
	parts.push(value.slice(start))
	return parts.map(part => part.trim()).filter(Boolean)
}

/** A computed `box-shadow` as its layers, each with its colour (the one word that is not a length) and inset. */
const shadows = (value: string) => value === 'none' ? [] : split(value, /,/).map(layer => {
	const words = split(layer, /\s/)
	return { color: words.find(word => word !== 'inset' && !/^[-+.\d]/.test(word)), inset: words.includes('inset'), layer }
})

type Indicator = { boxShadow: string; outline: string }

const indicator = (element: Element): Indicator => {
	const style = getComputedStyle(element)
	return {
		boxShadow: style.boxShadow,
		outline: style.outlineStyle === 'none' || Number.parseFloat(style.outlineWidth) === 0
			? 'none'
			: `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`,
	}
}

let resting = new WeakMap<Element, Indicator>()
let visited = new WeakSet<Element>()

/**
 * Starts a Tab walk at the top of the document, wherever a play left focus,
 * and records the resting outline and shadow of every element in `root`.
 * Returns how many elements in `root` take a Tab stop; call it before the first Tab.
 */
export const restFocus = (root: HTMLElement) => {
	// Focus moves the sequential navigation starting point; blur alone leaves it on the old element.
	const html = document.documentElement
	html.tabIndex = -1
	html.focus({ preventScroll: true })
	html.removeAttribute('tabindex')
	resting = new WeakMap()
	visited = new WeakSet()
	for (const element of [root, ...root.querySelectorAll('*')]) resting.set(element, indicator(element))
	return shown(root).filter(element => element.tabIndex >= 0 && !element.matches(':disabled')).length
}

/**
 * Asserts that the element keyboard focus is on shows the focus indicator:
 * never the native outline, and an outline or shadow on it or an ancestor in
 * `root` that differs from rest, with a colour at 3:1 against its surface.
 * Returns a description of the element, or null once focus leaves `root` or
 * comes back to an element already checked since `restFocus`.
 */
export const assertFocusVisible = (root: HTMLElement) => {
	const element = document.activeElement
	if (!element || !root.contains(element) || visited.has(element)) return null
	visited.add(element)
	const name = describe(element)
	if (!element.matches(':focus-visible')) throw new Error(`${name} took keyboard focus without :focus-visible`)
	if (getComputedStyle(element).outlineStyle === 'auto') throw new Error(`${name} shows the native focus outline`)

	let best = 0
	for (let node: Element | null = element; node && root.contains(node); node = node.parentElement) {
		const rest = resting.get(node) ?? { boxShadow: 'none', outline: 'none' }
		const now = indicator(node)
		const colors: Array<[string, boolean]> = []
		if (now.outline !== rest.outline && now.outline !== 'none') colors.push([getComputedStyle(node).outlineColor, false])
		const before = new Set(shadows(rest.boxShadow).map(({ layer }) => layer))
		for (const { color, inset, layer } of shadows(now.boxShadow)) {
			if (!before.has(layer) && color) colors.push([color, inset])
		}
		for (const [color, inset] of colors) {
			const behind = surface(inset ? node : node.parentElement)
			best = Math.max(best, contrast(over(rgba(color), behind), behind))
		}
	}
	if (best === 0) throw new Error(`${name} shows no focus indicator`)
	if (best < 3) throw new Error(`${name} focus indicator is ${best.toFixed(2)}:1 against its surface, under 3:1`)
	return name
}

/**
 * The box a pointer can hit, for each of `elements` in tree order: its own,
 * grown to the hit box a small target draws as an absolutely positioned
 * `::before` centred on it (the date segments, whose digits sit together), less
 * the strip a later target's grown box covers on the same line: the later one
 * paints over it and takes the pointer there.
 */
const hitBoxes = (elements: HTMLElement[]) => {
	const boxes = elements.map(element => {
		const rect = element.getBoundingClientRect()
		const before = getComputedStyle(element, '::before')
		if (before.content === 'none' || before.position !== 'absolute' || before.pointerEvents === 'none') return { grown: false, rect }
		const width = Math.max(rect.width, Number.parseFloat(before.width) || 0)
		const height = Math.max(rect.height, Number.parseFloat(before.height) || 0)
		return { grown: true, rect: new DOMRect(rect.left - (width - rect.width) / 2, rect.top - (height - rect.height) / 2, width, height) }
	})
	return boxes.map(({ rect }, index) => {
		let { left, right } = rect
		for (const [later, { grown, rect: cover }] of boxes.entries()) {
			if (later <= index || !grown || elements[index].contains(elements[later])) continue
			if (cover.top > rect.top || cover.bottom < rect.bottom || cover.right <= left || cover.left >= right) continue
			if (cover.left > left) right = Math.min(right, cover.left)
			else left = Math.max(left, cover.right)
		}
		return new DOMRect(left, rect.top, Math.max(right - left, 0), rect.height)
	})
}

/**
 * The control that makes a target equivalent under SC 2.5.8, by name: a date
 * segment (day, month or year) has its field's calendar button, which sets the
 * same date. Time segments have none.
 */
const equivalent = (element: Element) =>
	element.matches('[data-segment=day], [data-segment=month], [data-segment=year]')
		? element.closest('[data-slot=input-date]')?.querySelector('[data-slot=input-date-trigger]')
		: null

/**
 * Asserts WCAG 2.2 SC 2.5.8: every visible target in `root` is at least 24 by
 * 24 CSS px, or a 24 px circle on its centre touches no other target nor the
 * circle of another small target. Links inside a line of text are exempt, and
 * so is a target whose `equivalent` control passes itself (the criterion's
 * equivalent exception: a date segment beside its calendar button).
 * Throws a `target-size` failure with one line per undersized target.
 */
export const assertTargetSize = (root: HTMLElement) => {
	const elements = shown(root).filter(element => !(element.localName === 'a' && getComputedStyle(element).display === 'inline'))
	const boxes = hitBoxes(elements)
	const targets = elements.map((element, index) => ({ element, rect: boxes[index] }))
	const small = (rect: DOMRect) => rect.width < 24 || rect.height < 24
	const centre = (rect: DOMRect) => [rect.left + rect.width / 2, rect.top + rect.height / 2]
	const gap = (x: number, y: number, rect: DOMRect) =>
		Math.hypot(Math.max(rect.left - x, 0, x - rect.right), Math.max(rect.top - y, 0, y - rect.bottom))

	const undersized = targets.filter(({ element, rect }) => {
		if (!small(rect)) return false
		const [x, y] = centre(rect)
		return targets.some(other => {
			if (other.element === element || other.element.contains(element) || element.contains(other.element)) return false
			if (small(other.rect)) {
				const [ox, oy] = centre(other.rect)
				return Math.hypot(ox - x, oy - y) < 24 || gap(x, y, other.rect) < 12
			}
			return gap(x, y, other.rect) < 12
		})
	})
	const passes = (control: Element | null | undefined) =>
		!!control && elements.includes(control as HTMLElement) && !undersized.some(({ element }) => element === control)
	const failures = undersized.filter(({ element }) => !passes(equivalent(element)))
	if (failures.length) {
		throw new CheckError('target-size', failures.map(({ element, rect }) => `${describe(element)} is ${rect.width}x${rect.height}, under 24 px without spacing`))
	}
}

/** Asserts SC 1.4.10 at the current width: neither `root` nor any ancestor scrolls horizontally. */
export const assertReflow = (root: HTMLElement) => {
	for (let node: HTMLElement | null = root; node; node = node.parentElement) {
		if (node.scrollWidth > node.clientWidth + 1) {
			throw new Error(`${describe(node)} scrolls horizontally at ${innerWidth} px: ${node.scrollWidth} > ${node.clientWidth}`)
		}
	}
}

const bounded = 'input:not([type="checkbox"], [type="radio"], [type="range"]), textarea, select, [role="combobox"], [data-slot="button"][data-variant="default"]'

/**
 * Whether an element draws a border on all four sides or an outline that
 * forced colours repaint: a transparent one counts only because they do, so
 * `forced-color-adjust: none` does not.
 */
const outlined = (element: Element) => {
	const style = getComputedStyle(element)
	if (style.forcedColorAdjust === 'none') return false
	const border = (['Top', 'Right', 'Bottom', 'Left'] as const)
		.every(side => style[`border${side}Style`] !== 'none' && Number.parseFloat(style[`border${side}Width`]) > 0)
	return border || (style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0)
}

const choices = '[data-slot=checkbox], [data-slot=checkbox-group-item], [data-slot=radio-group-item], [data-slot=switch]'
const marks = '[data-slot=checkbox-indicator], [data-slot=radio-group-indicator], [data-slot=switch-thumb]'

/**
 * Asserts, under forced colours, that every text control, select and
 * combobox in `root`, and the primary button, keeps a boundary the system
 * colours paint: a border or an outline, since forced colours drop the shadows
 * Playa draws boundaries with. A control inside an InputGroup is bounded by
 * the group. Checkboxes, radios and switches keep one too, and their state:
 * the mark of a checked one (a switch's thumb, always) paints at 3:1 against
 * its part, since forced colours also paint fills as the page. Throws a
 * `forced-colors` failure with one line per control.
 */
export const assertForcedBoundaries = (root: HTMLElement) => {
	if (!matchMedia('(forced-colors: active)').matches) throw new Error('Forced colours are not active')
	const lines = shown(root)
		.filter(element => element.matches(bounded) && !outlined(element.closest('[data-slot="input-group"]') ?? element))
		.map(element => `${describe(element)} has no boundary without shadows`)
	for (const part of root.querySelectorAll<HTMLElement>(choices)) {
		const input = part.querySelector('input')
		const mark = part.querySelector<HTMLElement>(marks)
		if (!outlined(part)) lines.push(`${describe(part)} has no boundary without shadows`)
		if (!input || !mark || !(input.checked || input.indeterminate || part.dataset.slot === 'switch')) continue
		const behind = surface(part)
		const shows = contrast(over(rgba(getComputedStyle(mark).backgroundColor), behind), behind)
		if (shows < 3) lines.push(`${describe(part)} shows its checked mark at ${shows.toFixed(2)}:1, under 3:1`)
	}
	if (lines.length) throw new CheckError('forced-colors', lines)
}

/** The colour `value` (a CSS colour, custom properties included) resolves to inside `element`. */
const resolve = (element: HTMLElement, value: string) => {
	const probe = document.createElement('span')
	probe.style.color = value
	element.append(probe)
	const color = rgba(getComputedStyle(probe).color)
	probe.remove()
	return color
}

const same = (a: Rgba, b: Rgba) => a.slice(0, 3).every((channel, index) => Math.abs(channel - b[index]) <= 2)

/**
 * Asserts D28's ink on a choice control that is on: its `fill` is the text
 * colour (navy ink by day, ivory at night) at 3:1 against the surface behind
 * it, and its `mark` (glyph or thumb) is the page colour, one mark for every
 * on control, at 3:1 against the fill.
 */
export const assertInk = (fill: HTMLElement, mark: HTMLElement) => {
	const behind = surface(fill.parentElement)
	const ink = over(rgba(getComputedStyle(fill).backgroundColor), behind)
	const glyph = over(rgba(getComputedStyle(mark).backgroundColor), ink)
	const name = describe(fill)
	if (!same(ink, resolve(fill, 'var(--foreground)'))) throw new Error(`${name} fill is not the text colour`)
	if (!same(glyph, resolve(fill, 'var(--background)'))) throw new Error(`${name} mark is not the page colour`)
	if (contrast(ink, behind) < 3) throw new Error(`${name} fill is ${contrast(ink, behind).toFixed(2)}:1 against its surface, under 3:1`)
	if (contrast(glyph, ink) < 3) throw new Error(`${name} mark is ${contrast(glyph, ink).toFixed(2)}:1 against its fill, under 3:1`)
}

/**
 * Asserts D28 on every switch in `root`: each one that is on wears the ink
 * (`assertInk`), and brightness means on, so the thumb of every switch that
 * is off stands out from the surface behind it less than the fill of any
 * switch that is on. Forced colours paint the system's colours instead,
 * which `assertForcedBoundaries` checks.
 */
export const assertSwitches = (root: HTMLElement) => {
	if (matchMedia('(forced-colors: active)').matches) return
	const parts = [...root.querySelectorAll<HTMLElement>('[data-slot=switch]')].map(part => ({
		input: part.querySelector('input')!,
		part,
		thumb: part.querySelector<HTMLElement>('[data-slot=switch-thumb]')!,
	}))
	const standout = (element: HTMLElement, part: HTMLElement) => {
		const behind = surface(part.parentElement)
		return contrast(over(rgba(getComputedStyle(element).backgroundColor), behind), behind)
	}
	const on = parts.filter(({ input }) => input.checked)
	const off = parts.filter(({ input }) => !input.checked)
	if (!on.length || !off.length) throw new Error('The screen needs a switch on and a switch off')
	for (const { part, thumb } of on) assertInk(part, thumb)
	const dimmest = Math.min(...on.map(({ part }) => standout(part, part)))
	const brightest = Math.max(...off.map(({ part, thumb }) => standout(thumb, part)))
	if (brightest >= dimmest) throw new Error(`An off switch thumb stands out at ${brightest.toFixed(2)}:1, as much as an on switch (${dimmest.toFixed(2)}:1)`)
}

const moving = /^(?:transform|translate|scale|rotate)$/

/**
 * Watches for `ms` milliseconds and asserts that no running animation or
 * transition moves anything with a transform; one failure line per element.
 */
export const assertNoTransformMotion = async (ms: number) => {
	const seen = new Set<string>()
	const deadline = performance.now() + ms
	while (performance.now() < deadline) {
		for (const animation of document.getAnimations()) {
			const effect = animation.effect as KeyframeEffect | null
			const target = effect?.target
			const properties = animation instanceof CSSTransition
				? [animation.transitionProperty]
				: (effect?.getKeyframes() ?? []).flatMap(frame => Object.keys(frame))
			const moved = new Set(properties.filter(property => moving.test(property)))
			if (moved.size && target) seen.add(`${describe(target)} ${[...moved].join(' ')}`)
		}
		await frame()
	}
	if (seen.size) throw new CheckError('motion', [...seen].map(motion => `${motion} moves under reduced motion`))
}
