// @vitest-environment happy-dom
import type { Host } from 'ajo'
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { expect, test, vi } from 'vitest'
import { announce } from 'ajo-cloves'
import { mount, serve, tick } from './harness'

const regions = () =>
	[...document.body.querySelectorAll<HTMLDivElement>('[aria-live]')]

test('first polite call creates one status region with the right attributes', () => {
	const { view } = mount(announce)

	view.polite('Saved')

	const found = regions()

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
	const { view } = mount(announce)

	view.polite('One')
	const first = regions()[0]

	expect(first.textContent).toBe('')

	await tick()

	expect(first.textContent).toBe('One')

	view.polite('Two')

	expect(regions()).toEqual([first])
	expect(first.textContent).toBe('')

	await tick()

	expect(first.textContent).toBe('Two')
})

test('repeated identical messages clear before being set again', async () => {
	const { view } = mount(announce)

	view.polite('Same')
	await tick()

	const region = regions()[0]

	expect(region.textContent).toBe('Same')

	view.polite('Same')

	expect(region.textContent).toBe('')

	await tick()

	expect(region.textContent).toBe('Same')
})

test('two hosts share the same region', () => {
	const views: ReturnType<typeof announce>[] = []

	function* Child(this: Host) {
		views.push(announce(this))
		yield null
	}

	render([jsx(Child, { key: 'a' }), jsx(Child, { key: 'b' })], document.body)

	views[0].polite('A')
	views[1].polite('B')

	expect(regions()).toHaveLength(1)
})

test('SSR methods are inert and do not create regions', () => {
	const create = vi.spyOn(document, 'createElement')

	expect(serve(host => announce(host).polite('Polite'))).toBe('<div>server</div>')
	expect(create).not.toHaveBeenCalled()
	expect(regions()).toHaveLength(0)
})
