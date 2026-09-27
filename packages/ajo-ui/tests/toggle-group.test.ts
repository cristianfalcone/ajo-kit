// @vitest-environment happy-dom
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, expect, test } from 'vitest'
import { DirectionProvider } from '../src/direction'
import { ToggleGroup, ToggleGroupItem } from '../src/toggle-group'
import './user-agent-dir'

const group = (args: Record<string, unknown> = {}) => jsx(ToggleGroup, {
	...args,
	'aria-label': 'Alignment',
	children: ['left', 'center', 'right'].map(value => jsx(ToggleGroupItem, { children: value, key: value, value })),
})

const item = (value: string) => {
	const element = document.querySelector<HTMLButtonElement>(`[data-slot="toggle-group-item"][value="${value}"]`)
	if (!element) throw new Error(`Missing item ${value}`)
	return element
}

const key = (target: HTMLElement, value: string) => target.dispatchEvent(new KeyboardEvent('keydown', {
	bubbles: true,
	cancelable: true,
	key: value,
}))

afterEach(() => render(null, document.body))

test('horizontal arrows follow the nearest DirectionProvider', () => {
	render(jsx(DirectionProvider, { children: group(), dir: 'rtl' }), document.body)

	item('left').focus()
	key(item('left'), 'ArrowLeft')
	expect(document.activeElement).toBe(item('center'))

	key(item('center'), 'ArrowRight')
	expect(document.activeElement).toBe(item('left'))
})

test('an explicit dir wins over the provider and stays on the host', () => {
	render(jsx(DirectionProvider, { children: group({ dir: 'ltr' }), dir: 'rtl' }), document.body)

	item('left').focus()
	key(item('left'), 'ArrowRight')
	expect(document.activeElement).toBe(item('center'))
	expect(document.querySelector('[data-slot="toggle-group"]')?.getAttribute('dir')).toBe('ltr')
})

test('the unstyled group carries no theme markers', () => {
	render(group(), document.body)

	for (const element of [document.querySelector('[data-slot="toggle-group"]')!, item('left')]) {
		expect(element.hasAttribute('data-size')).toBe(false)
		expect(element.hasAttribute('data-spacing')).toBe(false)
		expect(element.hasAttribute('data-variant')).toBe(false)
	}
})
