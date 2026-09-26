// @vitest-environment happy-dom
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, expect, test, vi } from 'vitest'
import { Command, CommandInput, CommandItem, CommandList } from '../src/command'

afterEach(() => render(null, document.body))

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
