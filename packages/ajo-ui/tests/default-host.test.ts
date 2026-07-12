// @vitest-environment happy-dom
import { defaults, render, type Stateless } from 'ajo'
import { defaults as htmlDefaults, render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, expect, test } from 'vitest'
import { DirectionProvider, useDirection } from '../src/direction'

const defaultDomTag = defaults.tag
const defaultHtmlTag = htmlDefaults.tag

const DirectionReadout: Stateless = () => jsx('output', {
	'data-direction': useDirection(),
})

afterEach(() => {
	defaults.tag = defaultDomTag
	htmlDefaults.tag = defaultHtmlTag
	render(null, document.body)
})

test('default-host roots follow the configured Ajo DOM tag', () => {
	defaults.tag = 'section'
	render(jsx(DirectionProvider, { children: 'Content', dir: 'rtl' }), document.body)

	expect(document.querySelector('[data-slot="direction-provider"]')?.tagName).toBe('SECTION')
})

test('default-host roots follow the configured Ajo SSR tag', () => {
	htmlDefaults.tag = 'section'
	const html = ssr(jsx(DirectionProvider, {
		children: jsx(DirectionReadout, {}),
		class: 'scope',
		dir: 'rtl',
		id: 'direction-scope',
	}))

	expect(html).toMatch(/^<section\b/)
	expect(html.match(/<section\b/g)).toHaveLength(1)
	expect(html).toContain('class="scope"')
	expect(html).toContain('id="direction-scope"')
	expect(html).toContain('data-slot="direction-provider"')
	expect(html).toContain('dir="rtl"')
	expect(html).toContain('<output data-direction="rtl"></output>')
})
