// @vitest-environment happy-dom
import type { Stateful, Stateless } from 'ajo'
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, expect, test } from 'vitest'
import { type Direction, DirectionProvider, useDirection } from '../src/direction'

const DirectionReadout: Stateless = () => jsx('output', {
	'data-direction': useDirection(),
})

const SwitchingDirection: Stateful = function* () {
	let provided = true
	const leave = () => this.next(() => provided = false)

	while (true) yield jsx('div', {
		children: [
			jsx('button', { 'set:onclick': leave, type: 'button' }),
			provided
				? jsx(DirectionProvider, { children: jsx(DirectionReadout, {}), dir: 'rtl' })
				: jsx(DirectionReadout, {}),
		],
	})
}

const IsolatedDirections: Stateless = () => jsx('div', {
	children: [
		jsx(DirectionReadout, {}),
		jsx(DirectionProvider, {
			children: [
				jsx(DirectionReadout, {}),
				jsx(DirectionProvider, {
					children: jsx(DirectionReadout, {}),
					dir: 'ltr',
				}),
				jsx(DirectionReadout, {}),
			],
			dir: 'rtl',
		}),
		jsx(DirectionReadout, {}),
	],
})

const UpdatingDirection: Stateful = function* () {
	let dir: Direction = 'rtl'
	const flip = () => this.next(() => dir = 'ltr')

	while (true) yield jsx('div', {
		children: [
			jsx('button', { 'set:onclick': flip, type: 'button' }),
			jsx(DirectionProvider, {
				children: jsx(DirectionReadout, {}),
				dir,
			}),
		],
	})
}

afterEach(() => render(null, document.body))

test('removing a direction provider restores the parent context value', () => {
	render(jsx(SwitchingDirection, {}), document.body)
	expect(document.querySelector('output')?.dataset.direction).toBe('rtl')

	document.querySelector('button')?.click()
	expect(document.querySelector('output')?.dataset.direction).toBe('ltr')
})

test('nested providers restore their parent without leaking to siblings', () => {
	render(jsx(IsolatedDirections, {}), document.body)

	expect(Array.from(document.querySelectorAll('output'), output => output.dataset.direction))
		.toEqual(['ltr', 'rtl', 'ltr', 'rtl', 'ltr'])
})

test('updating a provider refreshes its host and context in place', () => {
	render(jsx(UpdatingDirection, {}), document.body)
	const provider = document.querySelector<HTMLElement>('[data-slot="direction-provider"]')

	expect(provider?.dir).toBe('rtl')
	expect(provider?.querySelector('output')?.dataset.direction).toBe('rtl')

	document.querySelector('button')?.click()
	expect(document.querySelector('[data-slot="direction-provider"]')).toBe(provider)
	expect(provider?.dir).toBe('ltr')
	expect(provider?.querySelector('output')?.dataset.direction).toBe('ltr')
})
