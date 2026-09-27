// @vitest-environment happy-dom
import type { Stateful, Stateless } from 'ajo'
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { Calendar } from '../src/calendar'
import { type Direction, DirectionProvider } from '../src/direction'
import { direction } from '../src/shared'
import { Tabs, TabsList, TabsTrigger } from '../src/tabs'
import { ToggleGroup, ToggleGroupItem } from '../src/toggle-group'
import { Toolbar } from '../src/toolbar'
import './user-agent-dir'

const IsolatedDirections: Stateless = () => jsx('div', {
	children: [
		jsx('output', {}),
		jsx(DirectionProvider, {
			children: [
				jsx('output', {}),
				jsx(DirectionProvider, { children: jsx('output', {}), dir: 'ltr' }),
				jsx('output', {}),
			],
			dir: 'rtl',
		}),
		jsx('output', {}),
	],
})

const UpdatingDirection: Stateful = function* () {
	let dir: Direction = 'rtl'
	const flip = () => this.next(() => dir = 'ltr')

	while (true) yield jsx('div', {
		children: [
			jsx('button', { 'set:onclick': flip, type: 'button' }),
			jsx(DirectionProvider, { children: jsx('output', {}), dir }),
		],
	})
}

const nativeOffsetParent = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent')

beforeEach(() => {
	// happy-dom has no layout: Tabs and Toolbar skip controls without an offsetParent.
	Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
		configurable: true,
		get(this: HTMLElement) { return this.parentElement },
	})
})

afterEach(() => {
	render(null, document.body)
	document.documentElement.removeAttribute('dir')
	if (nativeOffsetParent) Object.defineProperty(HTMLElement.prototype, 'offsetParent', nativeOffsetParent)
	else delete (HTMLElement.prototype as { offsetParent?: unknown }).offsetParent
})

const values = ['one', 'two', 'three']

// Each case renders a horizontal row of three items whose second is `[data-value="two"]`.
const rows = {
	tabs: (args: Record<string, unknown>) => jsx(Tabs, {
		...args,
		children: jsx(TabsList, { children: values.map(value => jsx(TabsTrigger, { children: value, key: value, value })) }),
		defaultValue: 'one',
	}),
	toolbar: (args: Record<string, unknown>) => jsx(Toolbar, {
		...args,
		'aria-label': 'Format',
		children: values.map(value => jsx('button', { children: value, 'data-value': value, key: value, type: 'button' })),
	}),
	'toggle-group': (args: Record<string, unknown>) => jsx(ToggleGroup, {
		...args,
		'aria-label': 'Alignment',
		children: values.map(value => jsx(ToggleGroupItem, { children: value, key: value, value })),
	}),
}

const item = (value: string) => {
	const element = document.querySelector<HTMLElement>(`[data-value="${value}"], [value="${value}"]`)
	if (!element) throw new Error(`Missing item ${value}`)
	return element
}

const press = (target: HTMLElement, key: string) => target.dispatchEvent(new KeyboardEvent('keydown', {
	bubbles: true,
	cancelable: true,
	key,
}))

test('nested providers scope the resolved direction without leaking to siblings', () => {
	render(jsx(IsolatedDirections, {}), document.body)

	expect(Array.from(document.querySelectorAll('output'), direction))
		.toEqual(['ltr', 'rtl', 'ltr', 'rtl', 'ltr'])
})

test('updating a provider refreshes its host in place', () => {
	render(jsx(UpdatingDirection, {}), document.body)
	const provider = document.querySelector<HTMLElement>('[data-slot="direction-provider"]')

	expect(provider?.dir).toBe('rtl')
	expect(direction(provider!.querySelector('output')!)).toBe('rtl')

	document.querySelector('button')?.click()
	expect(document.querySelector('[data-slot="direction-provider"]')).toBe(provider)
	expect(provider?.dir).toBe('ltr')
	expect(direction(provider!.querySelector('output')!)).toBe('ltr')
})

test.each(Object.keys(rows) as (keyof typeof rows)[])('%s arrows follow a document-level dir without a provider and write no dir', name => {
	document.documentElement.dir = 'rtl'
	render(rows[name]({}), document.body)

	item('one').focus()
	press(item('one'), 'ArrowLeft')
	expect(document.activeElement).toBe(item('two'))
	press(item('two'), 'ArrowRight')
	expect(document.activeElement).toBe(item('one'))
	expect(document.body.querySelector('[dir]')).toBeNull()
})

test.each(Object.keys(rows) as (keyof typeof rows)[])('%s writes an explicit dir, which wins over the document', name => {
	document.documentElement.dir = 'rtl'
	render(rows[name]({ dir: 'ltr' }), document.body)

	item('one').focus()
	press(item('one'), 'ArrowRight')
	expect(document.activeElement).toBe(item('two'))
	expect(document.body.querySelector('[dir]')?.getAttribute('dir')).toBe('ltr')
})

test('the Calendar day grid follows a document-level dir without a provider and writes no dir', async () => {
	document.documentElement.dir = 'rtl'
	render(jsx(Calendar, { defaultMonth: new Date(2026, 6, 1, 12) }), document.body)
	const day = (value: string) => document.querySelector<HTMLElement>(`[data-day="${value}"]`)!

	day('2026-07-15').focus()
	press(day('2026-07-15'), 'ArrowLeft')
	// The grid moves focus after its render pass.
	await new Promise(resolve => setTimeout(resolve, 0))
	expect(document.activeElement).toBe(day('2026-07-16'))
	expect(document.body.querySelector('[dir]')).toBeNull()
})
