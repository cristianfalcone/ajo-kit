// @vitest-environment happy-dom
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

const floating = vi.hoisted(() => ({
	autoUpdate: vi.fn(),
	computePosition: vi.fn(),
}))

vi.mock('@floating-ui/dom', async importActual => ({
	...await importActual<typeof import('@floating-ui/dom')>(),
	autoUpdate: floating.autoUpdate,
	computePosition: floating.computePosition,
}))

import { Select, SelectChips, SelectChipsInput, SelectClear, SelectContent, SelectInput, SelectItem, SelectList } from '../src/select'
import { nativePopoverHarness } from './native-popover-harness'

const popovers = nativePopoverHarness()

const countries = [
	{ code: 'AR', label: 'Argentina', value: 'argentina' },
	{ code: 'BR', label: 'Brazil', value: 'brazil' },
	{ code: 'CL', label: 'Chile', value: 'chile' },
	{ code: 'JP', label: 'Japan', value: 'japan' },
]

const items = () => countries.map(country => jsx(SelectItem, {
	children: country.label,
	key: country.value,
	keywords: [country.code],
	value: country.value,
}))

const input = () => document.querySelector<HTMLInputElement>('[data-slot="select-input"]')!

const option = (value: string) => document.querySelector<HTMLElement>(`[data-slot="select-item"][data-value="${value}"]`)!

const type = async (target: HTMLInputElement, value: string) => {
	target.focus()
	target.value = value
	target.dispatchEvent(new Event('input', { bubbles: true }))
	await vi.waitFor(() => expect(document.querySelector('[data-slot="select-content"]')?.getAttribute('data-state')).toBe('open'))
}

beforeEach(() => {
	popovers.install()
	floating.computePosition.mockResolvedValue({ x: 0, y: 0, placement: 'bottom-start', strategy: 'fixed', middlewareData: {} })
	floating.autoUpdate.mockImplementation((_reference, _floating, update) => {
		update()
		return vi.fn()
	})
})

afterEach(() => {
	render(null, document.body)
	popovers.restore()
})

test('a children-composed searchable Select with autoHighlight highlights the first visible match after typing', async () => {
	render(jsx(Select, {
		autoHighlight: true,
		children: [
			jsx(SelectInput, { key: 'input' }),
			jsx(SelectContent, { key: 'content', children: jsx(SelectList, { children: items() }) }),
		],
	}), document.body)

	await type(input(), 'ch')

	await vi.waitFor(() => expect(option('chile').dataset.highlighted).toBe('true'))
	expect(input().getAttribute('aria-activedescendant')).toBe(option('chile').id)
	expect(option('argentina').hidden).toBe(true)
})

test('keyword-only matches stay visible and take the automatic highlight', async () => {
	render(jsx(Select, {
		autoHighlight: true,
		children: [
			jsx(SelectInput, { key: 'input' }),
			jsx(SelectContent, { key: 'content', children: jsx(SelectList, { children: items() }) }),
		],
	}), document.body)

	await type(input(), 'jp')

	await vi.waitFor(() => expect(option('japan').dataset.highlighted).toBe('true'))
	expect(option('japan').hidden).toBe(false)
	expect(['argentina', 'brazil', 'chile'].map(value => option(value).hidden)).toEqual([true, true, true])
})

test('hidden inputs submit string keys for single and multiple selections', async () => {
	render(jsx('form', {
		children: [
			jsx(Select, {
				defaultValue: 'brazil',
				key: 'single',
				name: 'country',
				children: [
					jsx(SelectInput, { key: 'input' }),
					jsx(SelectContent, { key: 'content', children: jsx(SelectList, { children: items() }) }),
				],
			}),
			jsx(Select, {
				defaultValue: ['argentina'],
				key: 'multiple',
				multiple: true,
				name: 'visited',
				children: [
					jsx(SelectChips, { key: 'chips', children: jsx(SelectChipsInput, {}) }),
					jsx(SelectContent, { key: 'content', children: jsx(SelectList, { children: items() }) }),
				],
			}),
		],
	}), document.body)

	const form = document.querySelector('form')!
	expect(new FormData(form).get('country')).toBe('brazil')
	expect(new FormData(form).getAll('visited')).toEqual(['argentina'])

	const [, multiple] = document.querySelectorAll<HTMLElement>('[data-slot="select-list"]')
	multiple.querySelector<HTMLElement>('[data-value="japan"]')!.click()
	document.querySelector<HTMLElement>('[data-value="chile"]')!.click()

	await vi.waitFor(() => expect(new FormData(form).getAll('visited')).toEqual(['argentina', 'japan']))
	expect(new FormData(form).get('country')).toBe('chile')
	for (const hidden of form.querySelectorAll<HTMLInputElement>('input[type="hidden"]')) {
		expect(hidden.getAttribute('value')).toBe(hidden.value)
	}
})

test('server-rendered hidden inputs carry the selected keys as value attributes', () => {
	const html = ssr(jsx('form', {
		children: [
			jsx(Select, {
				defaultValue: 'brazil',
				key: 'single',
				name: 'country',
				children: jsx(SelectInput, {}),
			}),
			jsx(Select, {
				defaultValue: ['argentina', 'japan'],
				key: 'multiple',
				multiple: true,
				name: 'visited',
				children: jsx(SelectChips, { children: jsx(SelectChipsInput, {}) }),
			}),
		],
	}))

	expect(html).toContain('name="country" type="hidden" value="brazil"')
	expect(html.match(/type="hidden" value="[^"]*"/g)).toEqual([
		'type="hidden" value="brazil"',
		'type="hidden" value="argentina"',
		'type="hidden" value="japan"',
	])
})

test('a composed SelectClear sits in the SelectInput inline-end addon and clears the selection', async () => {
	const onValueChange = vi.fn()
	render(jsx(Select, {
		defaultValue: 'chile',
		onValueChange,
		children: [
			jsx(SelectInput, { key: 'input', children: jsx(SelectClear, {}) }),
			jsx(SelectContent, { key: 'content', children: jsx(SelectList, { children: items() }) }),
		],
	}), document.body)

	const clear = document.querySelector<HTMLButtonElement>('[data-slot="input-group-addon"] > [data-slot="select-clear"]')
	expect(clear).not.toBeNull()
	clear!.click()

	expect(onValueChange).toHaveBeenLastCalledWith('', expect.any(Event))
	await vi.waitFor(() => expect(document.querySelector('[data-slot="select-clear"]')).toBeNull())
})

test('a caller set:onclick on SelectItem runs first and preventing it skips selection', () => {
	const onSelect = vi.fn()
	const onValueChange = vi.fn()
	render(jsx(Select, {
		multiple: true,
		onValueChange,
		children: jsx(SelectContent, {
			children: jsx(SelectList, {
				children: [
					jsx(SelectItem, { children: 'One', key: 'one', onSelect, 'set:onclick': (event: Event) => event.preventDefault(), value: 'one' }),
					jsx(SelectItem, { children: 'Two', key: 'two', onSelect, value: 'two' }),
				],
			}),
		}),
	}), document.body)

	option('one').click()
	option('two').click()

	expect(onSelect.mock.calls.map(([value]) => value)).toEqual(['two'])
	expect(onValueChange.mock.calls.map(([value]) => value)).toEqual([['two']])
})
