// @vitest-environment happy-dom
import { expect, test } from 'vitest'
import { syncCheckedState } from '../src/utils'

test('syncCheckedState mirrors checkbox tri-state and keeps radios binary', () => {
	const input = document.createElement('input')
	const companion = document.createElement('span')
	input.type = 'checkbox'

	input.indeterminate = true
	expect(syncCheckedState(input, companion)).toBe('indeterminate')
	expect(input.dataset.state).toBe('indeterminate')
	expect(input.getAttribute('aria-checked')).toBe('mixed')
	expect(companion.dataset.state).toBe('indeterminate')
	expect(companion.hasAttribute('aria-checked')).toBe(false)

	input.indeterminate = false
	input.checked = true
	expect(syncCheckedState(input, companion)).toBe('checked')
	expect(input.dataset.state).toBe('checked')
	expect(input.getAttribute('aria-checked')).toBe('true')
	expect(companion.dataset.state).toBe('checked')

	input.checked = false
	expect(syncCheckedState(input, companion)).toBe('unchecked')
	expect(input.dataset.state).toBe('unchecked')
	expect(input.getAttribute('aria-checked')).toBe('false')
	expect(companion.dataset.state).toBe('unchecked')

	input.type = 'radio'
	input.indeterminate = true
	input.checked = true
	expect(syncCheckedState(input, companion)).toBe('checked')
	expect(input.getAttribute('aria-checked')).toBe('true')

	input.checked = false
	expect(syncCheckedState(input, companion)).toBe('unchecked')
	expect(input.getAttribute('aria-checked')).toBe('false')
})
