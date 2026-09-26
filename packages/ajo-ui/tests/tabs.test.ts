// @vitest-environment happy-dom
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../src/tabs'

const nativeOffsetParent = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent')

const tabs = (args: Record<string, unknown>) => jsx(Tabs, {
	...args,
	children: [
		jsx(TabsList, {
			children: ['one', 'two'].map(value => jsx(TabsTrigger, { children: value, key: value, value })),
			key: 'list',
		}),
		jsx(TabsContent, { children: 'One', key: 'one', value: 'one' }),
		jsx(TabsContent, { children: 'Two', key: 'two', value: 'two' }),
	],
})

const trigger = (value: string) => {
	const element = document.querySelector<HTMLButtonElement>(`[data-slot="tabs-trigger"][value="${value}"]`)
	if (!element) throw new Error(`Missing trigger ${value}`)
	return element
}

const key = (target: HTMLElement, value: string) => target.dispatchEvent(new KeyboardEvent('keydown', {
	bubbles: true,
	cancelable: true,
	key: value,
}))

const settle = () => new Promise(resolve => setTimeout(resolve, 0))

beforeEach(() => {
	Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
		configurable: true,
		get(this: HTMLElement) { return this.parentElement },
	})
})

afterEach(() => {
	render(null, document.body)
	document.body.replaceChildren()
	if (nativeOffsetParent) Object.defineProperty(HTMLElement.prototype, 'offsetParent', nativeOffsetParent)
	else delete (HTMLElement.prototype as { offsetParent?: unknown }).offsetParent
})

test('automatic Tabs select a tab once, through focus, when arrows move to it', async () => {
	const change = vi.fn()
	render(tabs({ defaultValue: 'one', onValueChange: change }), document.body)

	trigger('one').focus()
	key(trigger('one'), 'ArrowRight')
	await settle()

	expect(document.activeElement).toBe(trigger('two'))
	expect(trigger('two').getAttribute('aria-selected')).toBe('true')
	expect(change).toHaveBeenCalledTimes(1)
	expect(change).toHaveBeenCalledWith('two', expect.any(FocusEvent))
})

test('manual Tabs leave Enter and Space to native button activation', async () => {
	const change = vi.fn()
	render(tabs({ activationMode: 'manual', defaultValue: 'one', onValueChange: change }), document.body)

	trigger('one').focus()
	key(trigger('one'), 'ArrowRight')
	await settle()
	expect(document.activeElement).toBe(trigger('two'))
	expect(change).not.toHaveBeenCalled()

	expect(key(trigger('two'), 'Enter')).toBe(true)
	expect(key(trigger('two'), ' ')).toBe(true)
	expect(change).not.toHaveBeenCalled()

	trigger('two').click()
	await settle()
	expect(trigger('two').getAttribute('aria-selected')).toBe('true')
	expect(change).toHaveBeenCalledTimes(1)
	expect(change).toHaveBeenCalledWith('two', expect.any(MouseEvent))
})
