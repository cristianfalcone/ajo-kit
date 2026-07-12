// @vitest-environment happy-dom
import { expect, test } from 'vitest'
import { collection } from '../src/collection'

const must = <T extends Element>(element: T | null): T => {
	if (!element) throw new Error('missing test element')
	return element
}

test('sweep derives structural selectors from the collection kind', () => {
	const root = document.createElement('div')
	root.innerHTML = `
		<div data-slot="palette-empty">No colors</div>
		<div data-slot="palette-separator" id="leading"></div>
		<div data-slot="palette-group" id="empty-group"></div>
		<div data-force-mount="true" data-slot="palette-group" id="forced-group" hidden></div>
		<div data-slot="palette-group">
			<div data-item="palette" data-value="red"></div>
		</div>
		<div data-slot="palette-separator" id="between"></div>
		<div data-slot="palette-separator" id="stacked"></div>
		<div data-slot="palette-group">
			<div data-item="palette" data-value="blue"></div>
		</div>
		<div data-slot="palette-separator" id="trailing"></div>
	`

	const visible = collection('palette', { rendered: false }).sweep(root)

	expect(visible.map(item => item.dataset.value)).toEqual(['red', 'blue'])
	expect(must(root.querySelector<HTMLElement>('[data-slot="palette-empty"]')).hidden).toBe(true)
	expect(must(root.querySelector<HTMLElement>('#empty-group')).hidden).toBe(true)
	expect(must(root.querySelector<HTMLElement>('#forced-group')).hidden).toBe(false)
	expect(must(root.querySelector<HTMLElement>('#leading')).hidden).toBe(true)
	expect(must(root.querySelector<HTMLElement>('#between')).hidden).toBe(false)
	expect(must(root.querySelector<HTMLElement>('#stacked')).hidden).toBe(true)
	expect(must(root.querySelector<HTMLElement>('#trailing')).hidden).toBe(true)
})

test('sweep restores groups before measuring rendered items', () => {
	const root = document.createElement('div')
	root.innerHTML = `
		<div data-slot="command-empty">No commands</div>
		<div data-slot="command-group" hidden>
			<div data-item="command" data-value="open"></div>
		</div>
	`
	const group = must(root.querySelector<HTMLElement>('[data-slot="command-group"]'))
	const item = must(root.querySelector<HTMLElement>('[data-item="command"]'))
	Object.defineProperty(item, 'offsetParent', {
		configurable: true,
		get: () => group.hidden ? null : root,
	})

	const visible = collection('command').sweep(root)

	expect(group.hidden).toBe(false)
	expect(visible).toEqual([item])
	expect(must(root.querySelector<HTMLElement>('[data-slot="command-empty"]')).hidden).toBe(true)
})

test.each([
	['empty', true, false],
	['group', false, true],
	['separator', false, true],
] as const)('an explicit %s selector replaces only its derived default', (role, initial, expected) => {
	const root = document.createElement('div')
	root.innerHTML = `
		<div data-slot="menu-${role}" ${initial ? 'hidden' : ''}></div>
		<div data-custom="${role}" ${initial ? 'hidden' : ''}></div>
	`
	const derived = must(root.querySelector<HTMLElement>(`[data-slot="menu-${role}"]`))
	const custom = must(root.querySelector<HTMLElement>(`[data-custom="${role}"]`))
	const selectors: Partial<Record<'empty' | 'group' | 'separator', string>> = {}
	selectors[role] = `[data-custom="${role}"]`

	collection('menu', { rendered: false }).sweep(root, selectors)

	expect(custom.hidden).toBe(expected)
	expect(derived.hidden).toBe(initial)
})

test('a partial sweep override preserves the other kind-derived selectors', () => {
	const root = document.createElement('div')
	root.innerHTML = `
		<div data-slot="menu-empty"></div>
		<div data-custom="group"></div>
		<div data-item="menu" data-value="open"></div>
		<div data-slot="menu-separator"></div>
	`

	collection('menu', { rendered: false }).sweep(root, { group: '[data-custom="group"]' })

	expect(must(root.querySelector<HTMLElement>('[data-custom="group"]')).hidden).toBe(true)
	expect(must(root.querySelector<HTMLElement>('[data-slot="menu-empty"]')).hidden).toBe(true)
	expect(must(root.querySelector<HTMLElement>('[data-slot="menu-separator"]')).hidden).toBe(true)
})
