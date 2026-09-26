// @vitest-environment happy-dom
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { expect, test } from 'vitest'
import { indicator } from 'ajo-cloves'
import { frames, mount, must, observers, serve } from './harness'

type Box = { left: number; top: number; width: number; height: number }

const rect = (element: Element, box: Box) => {
	Object.defineProperty(element, 'getBoundingClientRect', {
		configurable: true,
		value: () => ({ ...box, right: box.left + box.width, bottom: box.top + box.height, x: box.left, y: box.top }),
	})
}

/** Mounts a container with a marked button and returns them with the view. */
const setup = (of: (container: HTMLElement) => HTMLElement | null, children: unknown) => {
	const { view } = mount(
		host => indicator(host, { target: () => document.getElementById('list'), of }),
		() => jsx('div', { id: 'list', children }),
	)
	const list = must(document.getElementById('list'))
	return { list, view }
}

test('stamps the marked child box as variables and reveals the marker a frame later', () => {
	const raf = frames()
	const { list, view } = setup(root => root.querySelector<HTMLElement>('[data-state="active"]'), [
		jsx('button', { key: 'a', 'data-state': 'active' }),
		jsx('button', { key: 'b' }),
	])
	rect(list, { left: 10, top: 20, width: 300, height: 40 })
	rect(must(list.querySelector('[data-state="active"]')), { left: 60, top: 24, width: 80, height: 32 })

	view.sync()
	raf.flush()

	expect(list.style.getPropertyValue('--indicator-x')).toBe('50px')
	expect(list.style.getPropertyValue('--indicator-y')).toBe('4px')
	expect(list.style.getPropertyValue('--indicator-w')).toBe('80px')
	expect(list.style.getPropertyValue('--indicator-h')).toBe('32px')
	// Variables land first; the marker attribute waits one frame so themed
	// pseudo-elements first paint already in position.
	expect(list.hasAttribute('data-indicator')).toBe(false)
	raf.flush()
	expect(list.getAttribute('data-indicator')).toBe('true')
})

test('drops the marker when no child matches and cleans up on abort', () => {
	const raf = frames()
	let active = true
	const { list, view } = setup(root => active ? root.querySelector<HTMLElement>('button') : null, jsx('button', {}))
	rect(list, { left: 0, top: 0, width: 100, height: 20 })
	rect(must(list.querySelector('button')), { left: 5, top: 2, width: 40, height: 16 })

	view.sync()
	raf.flush()
	raf.flush()
	expect(list.getAttribute('data-indicator')).toBe('true')

	active = false
	view.sync()
	raf.flush()
	expect(list.hasAttribute('data-indicator')).toBe(false)
	// Variables stay for a seamless return, only the marker drops.
	expect(list.style.getPropertyValue('--indicator-w')).toBe('40px')

	active = true
	render(null, document.body)
	expect(list.style.getPropertyValue('--indicator-w')).toBe('')
})

test('a container resize re-measures on the next frame', () => {
	const raf = frames()
	const observer = observers()
	const { list, view } = setup(root => root.querySelector<HTMLElement>('button'), jsx('button', {}))
	const mark = must(list.querySelector('button'))
	rect(list, { left: 0, top: 0, width: 100, height: 20 })
	rect(mark, { left: 5, top: 2, width: 40, height: 16 })

	view.sync()
	raf.flush()
	raf.flush()
	expect(list.style.getPropertyValue('--indicator-w')).toBe('40px')

	rect(mark, { left: 5, top: 2, width: 60, height: 16 })
	must(observer.at(-1)).trigger(list)
	raf.flush()
	expect(list.style.getPropertyValue('--indicator-w')).toBe('60px')
})

test('SSR sync is inert and does not resolve the target', () => {
	expect(serve(host => indicator(host, {
		target: () => {
			throw new Error('target should not run on the server')
		},
		of: () => null,
	}).sync())).toBe('<div>server</div>')
})
