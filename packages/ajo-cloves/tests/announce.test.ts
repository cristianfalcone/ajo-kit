// @vitest-environment happy-dom
import type { Host } from 'ajo-cloves'
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { announce } from 'ajo-cloves'

type View = ReturnType<typeof announce>

const prepare = () => {
	if (!globalThis.MutationObserver) globalThis.MutationObserver = window.MutationObserver
	document.body.textContent = ''
}

const tick = () => new Promise<void>(resolve => queueMicrotask(resolve))

const mount = () => {
	let view: View | undefined

	function* Gen(this: Host) {
		view = announce(this)
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	if (!view) throw new Error('missing view')
	return view
}

const regions = (live: 'polite' | 'assertive') =>
	[...document.body.querySelectorAll<HTMLDivElement>(`[aria-live="${live}"]`)]

beforeEach(prepare)

afterEach(() => {
	render(null, document.body)
	document.body.textContent = ''
	vi.restoreAllMocks()
})

test('first polite call creates one status region with the right attributes', () => {
	const view = mount()

	view.polite('Saved')

	const found = regions('polite')

	expect(found).toHaveLength(1)
	expect(found[0].getAttribute('role')).toBe('status')
	expect(found[0].getAttribute('aria-atomic')).toBe('true')
	expect(found[0].getAttribute('style')).toContain('clip:rect(0 0 0 0)')
	expect(found[0].style.position).toBe('absolute')
	expect(found[0].style.width).toBe('1px')
	expect(found[0].style.height).toBe('1px')
	expect(found[0].style.margin).toBe('-1px')
	expect(found[0].style.padding).toBe('0px')
	expect(found[0].style.overflow).toBe('hidden')
	expect(found[0].style.whiteSpace).toBe('nowrap')
	expect(found[0].style.border).toBe('0px')
})

test('second polite call reuses the region and message lands after a microtask', async () => {
	const view = mount()

	view.polite('One')
	const first = regions('polite')[0]

	expect(first.textContent).toBe('')

	await tick()

	expect(first.textContent).toBe('One')

	view.polite('Two')

	expect(regions('polite')).toEqual([first])
	expect(first.textContent).toBe('')

	await tick()

	expect(first.textContent).toBe('Two')
})

test('repeated identical messages clear before being set again', async () => {
	const view = mount()

	view.polite('Same')
	await tick()

	const region = regions('polite')[0]

	expect(region.textContent).toBe('Same')

	view.polite('Same')

	expect(region.textContent).toBe('')

	await tick()

	expect(region.textContent).toBe('Same')
})

test('assertive creates a separate alert region', () => {
	const view = mount()

	view.polite('Polite')
	view.assertive('Alert')

	const polite = regions('polite')
	const assertive = regions('assertive')

	expect(polite).toHaveLength(1)
	expect(assertive).toHaveLength(1)
	expect(assertive[0]).not.toBe(polite[0])
	expect(assertive[0].getAttribute('role')).toBe('alert')
	expect(assertive[0].getAttribute('aria-atomic')).toBe('true')
})

test('two hosts share the same regions', () => {
	let a: View | undefined
	let b: View | undefined

	function* Child(this: Host, args: { name: string }) {
		const view = announce(this)

		if (args.name === 'a') a = view
		else b = view

		yield jsx('span', { children: args.name })
	}

	function* Gen(this: Host) {
		yield [
			jsx(Child, { key: 'a', name: 'a' }),
			jsx(Child, { key: 'b', name: 'b' }),
		]
	}

	render(jsx(Gen, {}), document.body)

	a!.polite('A')
	b!.polite('B')
	a!.assertive('A')
	b!.assertive('B')

	expect(regions('polite')).toHaveLength(1)
	expect(regions('assertive')).toHaveLength(1)
})

test('SSR methods are inert and do not create regions', () => {
	const create = vi.spyOn(document, 'createElement')

	function* Gen(this: Host) {
		const view = announce(this)

		view.polite('Polite')
		view.assertive('Assertive')

		yield jsx('span', { children: 'server' })
	}

	expect(ssr(jsx(Gen, {}))).toBe('<div><span>server</span></div>')
	expect(create).not.toHaveBeenCalled()
	expect(regions('polite')).toHaveLength(0)
	expect(regions('assertive')).toHaveLength(0)
})
