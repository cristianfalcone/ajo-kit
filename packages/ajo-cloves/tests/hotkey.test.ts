// @vitest-environment happy-dom
import { render } from 'ajo'
import { expect, test, vi } from 'vitest'
import { hotkey } from 'ajo-cloves'
import { key, mount, serve } from './harness'

const press = (keys: string, opts: { active?: () => boolean } = {}) => {
	const fn = vi.fn()
	mount(host => hotkey(host, { keys: () => keys, onPress: fn, ...opts }))
	return fn
}

test('mod+b matches ctrl+b and meta+b', () => {
	const fn = press('mod+b')

	window.dispatchEvent(key('b', { ctrlKey: true }))
	window.dispatchEvent(key('B', { metaKey: true }))

	expect(fn).toHaveBeenCalledTimes(2)
})

test('plain key without modifiers does not match mod+b', () => {
	const fn = press('mod+b')
	window.dispatchEvent(key('b'))

	expect(fn).not.toHaveBeenCalled()
})

test('extra modifiers do not match mod+b', () => {
	const fn = press('mod+b')
	window.dispatchEvent(key('b', { ctrlKey: true, shiftKey: true }))
	window.dispatchEvent(key('b', { ctrlKey: true, metaKey: true }))

	expect(fn).not.toHaveBeenCalled()
})

test('F8 matches case-insensitively without modifiers', () => {
	const fn = press('f8')
	window.dispatchEvent(key('F8'))

	expect(fn).toHaveBeenCalledTimes(1)
})

test('active false blocks matched keys before preventing default', () => {
	const fn = press('mod+b', { active: () => false })

	const event = key('b', { ctrlKey: true })
	window.dispatchEvent(event)

	expect(fn).not.toHaveBeenCalled()
	expect(event.defaultPrevented).toBe(false)
})

test('a match is always prevented', () => {
	const fn = press('mod+b')

	const event = key('b', { ctrlKey: true })
	window.dispatchEvent(event)

	expect(event.defaultPrevented).toBe(true)
	expect(fn).toHaveBeenCalledTimes(1)
})

test('unmount removes the global listener', () => {
	const fn = press('mod+b')
	render(null, document.body)
	window.dispatchEvent(key('b', { ctrlKey: true }))

	expect(fn).not.toHaveBeenCalled()
})

test('SSR renders without installing or parsing shortcuts', () => {
	expect(serve(host => hotkey(host, {
		keys: () => {
			throw new Error('keys should not run on the server')
		},
		onPress: () => {},
	}))).toBe('<div>server</div>')
})
