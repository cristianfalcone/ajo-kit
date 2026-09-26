// @vitest-environment happy-dom
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, expect, test, vi } from 'vitest'

const floating = vi.hoisted(() => ({
	autoUpdate: vi.fn(),
	computePosition: vi.fn(),
}))

vi.mock('@floating-ui/dom', async importActual => ({
	...await importActual<typeof import('@floating-ui/dom')>(),
	autoUpdate: floating.autoUpdate,
	computePosition: floating.computePosition,
}))

import { Command, CommandInput, CommandItem, CommandList } from '../src/command'
import { Popover, PopoverContent, PopoverTrigger } from '../src/popover'
import { nativePopoverHarness } from './native-popover-harness'

const popovers = nativePopoverHarness()

const escape = (target: HTMLElement) => target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' }))

afterEach(() => {
	render(null, document.body)
	popovers.restore()
})

test('a controlled value without a visible item starts ArrowDown at the first item and ArrowUp at the last', () => {
	const onValueChange = vi.fn()
	render(jsx(Command, {
		onValueChange,
		value: '',
		children: [
			jsx(CommandInput, {}),
			jsx(CommandList, {
				children: ['one', 'two', 'three'].map(value => jsx(CommandItem, { children: value, key: value, value })),
			}),
		],
	}), document.body)

	const input = document.querySelector<HTMLInputElement>('[data-slot="command-input"]')!
	input.focus()
	for (const key of ['ArrowDown', 'ArrowUp']) {
		input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }))
	}

	expect(onValueChange.mock.calls.map(([value]) => value)).toEqual(['one', 'three'])
})

test('inside a Popover the first Escape clears the Command query and only the second closes the popover', async () => {
	popovers.install()
	floating.computePosition.mockResolvedValue({ x: 10, y: 20, placement: 'bottom', strategy: 'fixed', middlewareData: {} })
	floating.autoUpdate.mockImplementation((_reference, _floating, update) => {
		update()
		return vi.fn()
	})
	const onOpenChange = vi.fn()
	const onSearchChange = vi.fn()
	render(jsx(Popover, {
		onOpenChange,
		children: [
			jsx(PopoverTrigger, { children: 'Open', key: 'trigger' }),
			jsx(PopoverContent, {
				key: 'content',
				children: jsx(Command, {
					onSearchChange,
					children: [
						jsx(CommandInput, { key: 'input' }),
						jsx(CommandList, { key: 'list', children: jsx(CommandItem, { children: 'one', value: 'one' }) }),
					],
				}),
			}),
		],
	}), document.body)
	document.querySelector<HTMLButtonElement>('[data-slot="popover-trigger"]')!.click()
	const content = document.querySelector<HTMLElement>('[data-slot="popover-content"]')!
	// Rendering marks the content open at once; wait for the revealed first position.
	await vi.waitFor(() => {
		expect(floating.computePosition).toHaveBeenCalled()
		expect(content.dataset.state).toBe('open')
	})

	const input = document.querySelector<HTMLInputElement>('[data-slot="command-input"]')!
	input.value = 'on'
	input.dispatchEvent(new Event('input', { bubbles: true }))
	escape(input)

	expect(onSearchChange).toHaveBeenLastCalledWith('', expect.any(Event))
	expect(onOpenChange).not.toHaveBeenCalledWith(false, expect.anything())
	expect(content.dataset.state).toBe('open')

	escape(input)

	expect(onOpenChange).toHaveBeenLastCalledWith(false, expect.any(Event))
	expect(content.dataset.state).toBe('closed')
})

test('a caller set:onclick on CommandItem runs first and preventing it skips selection', () => {
	const onSelect = vi.fn()
	const onClick = vi.fn((event: Event) => event.preventDefault())
	render(jsx(Command, {
		children: jsx(CommandList, {
			children: [
				jsx(CommandItem, { children: 'one', key: 'one', onSelect, 'set:onclick': onClick, value: 'one' }),
				jsx(CommandItem, { children: 'two', key: 'two', onSelect, value: 'two' }),
			],
		}),
	}), document.body)

	const [one, two] = document.querySelectorAll<HTMLElement>('[data-slot="command-item"]')
	one.click()
	two.click()

	expect(onClick).toHaveBeenCalledOnce()
	expect(onSelect.mock.calls.map(([value]) => value)).toEqual(['two'])
})
