// @vitest-environment happy-dom
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, expect, test } from 'vitest'
import { DirectionProvider } from '../src/direction'

afterEach(() => {
	render(null, document.body)
})

test('default-host roots render the Ajo div host in the DOM', () => {
	render(jsx(DirectionProvider, { children: 'Content', dir: 'rtl' }), document.body)

	expect(document.querySelector('[data-slot="direction-provider"]')?.tagName).toBe('DIV')
})

test('default-host roots render the Ajo div host in SSR', () => {
	const html = ssr(jsx(DirectionProvider, {
		children: jsx('output', {}),
		class: 'scope',
		dir: 'rtl',
		id: 'direction-scope',
	}))

	expect(html).toMatch(/^<div\b/)
	expect(html.match(/<div\b/g)).toHaveLength(1)
	expect(html).toContain('class="scope"')
	expect(html).toContain('id="direction-scope"')
	expect(html).toContain('data-slot="direction-provider"')
	expect(html).toContain('dir="rtl"')
	expect(html).toContain('<output></output>')
})
