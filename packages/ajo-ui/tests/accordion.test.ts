// @vitest-environment happy-dom
import type { Stateful } from 'ajo'
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, expect, test, vi } from 'vitest'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../src/accordion'

const items = (...values: string[]) => values.map(value => jsx(AccordionItem, {
	children: [
		jsx(AccordionTrigger, { children: value, key: 'trigger' }),
		jsx(AccordionContent, { children: `${value} content`, key: 'content' }),
	],
	key: value,
	value,
}))

const trigger = (value: string) => {
	const element = document.querySelector<HTMLElement>(`[data-value="${value}"] [data-slot="accordion-trigger"]`)
	if (!element) throw new Error(`Missing trigger ${value}`)
	return element
}

const open = () => Array.from(document.querySelectorAll<HTMLElement>('[data-slot="accordion-item"]'))
	.filter(item => item.dataset.state === 'open')
	.map(item => item.dataset.value)

const settle = () => new Promise(resolve => setTimeout(resolve, 0))

afterEach(() => {
	render(null, document.body)
	document.body.replaceChildren()
})

test('single non-collapsible Accordion ignores a click on the open item', async () => {
	const change = vi.fn()
	render(jsx(Accordion, { children: items('a', 'b'), defaultValue: 'a', onValueChange: change }), document.body)

	trigger('a').click()
	await settle()
	expect(open()).toEqual(['a'])
	expect(change).not.toHaveBeenCalled()

	trigger('b').click()
	await settle()
	expect(open()).toEqual(['b'])
	expect(change).toHaveBeenLastCalledWith('b', expect.any(Event))
})

test('single collapsible Accordion closes the open item with an empty value', async () => {
	const change = vi.fn()
	render(jsx(Accordion, { children: items('a', 'b'), collapsible: true, defaultValue: 'a', onValueChange: change }), document.body)

	trigger('a').click()
	await settle()
	expect(open()).toEqual([])
	expect(change).toHaveBeenLastCalledWith('', expect.any(Event))
})

test('multiple Accordion toggles items independently, including the last open one', async () => {
	const change = vi.fn()
	render(jsx(Accordion, { children: items('a', 'b'), onValueChange: change, type: 'multiple' }), document.body)

	trigger('a').click()
	await settle()
	trigger('b').click()
	await settle()
	expect(open()).toEqual(['a', 'b'])
	expect(change).toHaveBeenLastCalledWith(['a', 'b'], expect.any(Event))

	trigger('a').click()
	await settle()
	trigger('b').click()
	await settle()
	expect(open()).toEqual([])
	expect(change).toHaveBeenLastCalledWith([], expect.any(Event))
})

test('controlled Accordion value syncs in single and multiple modes', async () => {
	let single: (value: string) => void = () => {}
	let multiple: (value: string[]) => void = () => {}
	const singleChange = vi.fn()
	const multipleChange = vi.fn()

	const Harness: Stateful = function* () {
		let one = 'a'
		let many = ['c']
		single = value => this.next(() => one = value)
		multiple = value => this.next(() => many = value)

		while (true) yield [
			jsx('div', { children: jsx(Accordion, { children: items('a', 'b'), onValueChange: singleChange, value: one }), id: 'single', key: 'single' }),
			jsx('div', { children: jsx(Accordion, { children: items('c', 'd'), onValueChange: multipleChange, type: 'multiple', value: many }), id: 'multiple', key: 'multiple' }),
		]
	}

	render(jsx(Harness, {}), document.body)
	expect(open()).toEqual(['a', 'c'])

	trigger('b').click()
	trigger('d').click()
	await settle()
	expect(singleChange).toHaveBeenLastCalledWith('b', expect.any(Event))
	expect(multipleChange).toHaveBeenLastCalledWith(['c', 'd'], expect.any(Event))
	expect(open()).toEqual(['a', 'c'])

	single('b')
	multiple(['d'])
	await settle()
	expect(open()).toEqual(['b', 'd'])

	single('')
	multiple([])
	await settle()
	expect(open()).toEqual([])
})

test('AccordionContent renders its children directly in the content region', () => {
	render(jsx(Accordion, { children: items('a'), defaultValue: 'a' }), document.body)

	const content = document.querySelector('[data-slot="accordion-content"]')
	expect(content?.getAttribute('role')).toBe('region')
	expect(content?.innerHTML).toBe('a content')
})
