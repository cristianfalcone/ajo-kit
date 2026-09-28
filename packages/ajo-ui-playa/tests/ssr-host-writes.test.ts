import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { expect, test } from 'vitest'
import { ButtonGroupSeparator } from 'ajo-ui-playa/button-group'
import { Card, CardHeader } from 'ajo-ui-playa/card'
import { ItemSeparator } from 'ajo-ui-playa/item'
import { PaginationLink } from 'ajo-ui-playa/pagination'
import { Spinner } from 'ajo-ui-playa/spinner'
import { ToggleGroup, ToggleGroupItem } from 'ajo-ui-playa/toggle-group'

test('Spinner is named once by its label text and a bare boolean aria-hidden hides it', () => {
	const spinner = ssr(jsx(Spinner, { label: 'Saving' }))
	const hidden = ssr(jsx(Spinner, { 'aria-hidden': '' }))

	expect(spinner).toContain('<span class="sr-only">Saving</span>')
	expect(spinner).not.toContain('aria-label=')
	expect(hidden).not.toContain('aria-label=')
	expect(hidden).not.toContain('class="sr-only"')
})

test('Card renders one polymorphic root and keeps caller slot overrides', () => {
	const link = ssr(jsx(Card, { as: 'a', href: '/plans', 'data-slot': 'plan-card', children: jsx(CardHeader, { 'data-slot': 'plan-header' }) }))

	expect(link).toMatch(/^<a\b(?=[^>]*href="\/plans")(?=[^>]*data-slot="plan-card")(?=[^>]*data-size="default")[^>]*>/)
	expect(link).toMatch(/<div\b(?=[^>]*data-slot="plan-header")(?=[^>]*class="[^"]*\bgrid\b)[^>]*>/)
})

test('Item and ButtonGroup separators are decorative Separators under their own slots', () => {
	const item = ssr(jsx(ItemSeparator, {}))
	const group = ssr(jsx(ButtonGroupSeparator, {}))

	expect(item).toMatch(/^<div\b(?=[^>]*data-slot="item-separator")(?=[^>]*data-orientation="horizontal")(?=[^>]*aria-hidden="true")(?=[^>]*role="none")[^>]*>/)
	expect(group).toMatch(/^<div\b(?=[^>]*data-slot="button-group-separator")(?=[^>]*data-orientation="vertical")(?=[^>]*aria-hidden="true")(?=[^>]*role="none")[^>]*>/)
})

test('a disabled PaginationLink is a Button link without href or tab stop', () => {
	const current = ssr(jsx(PaginationLink, { href: '?page=2', isActive: true, children: '2' }))
	const disabled = ssr(jsx(PaginationLink, { disabled: true, href: '?page=0', children: '0' }))

	expect(current).toMatch(/^<a\b(?=[^>]*href="\?page=2")(?=[^>]*aria-current="page")(?=[^>]*data-slot="pagination-link")(?=[^>]*data-variant="outline")[^>]*>2<\/a>$/)
	expect(disabled).toMatch(/^<a\b(?=[^>]*aria-disabled="true")(?=[^>]*tabindex="-1")(?![^>]*href=)(?=[^>]*data-slot="pagination-link")[^>]*>0<\/a>$/i)
})

test('ToggleGroup items take the group size and variant, and spacing 0 seams them at the group', () => {
	const html = ssr(jsx(ToggleGroup, {
		'aria-label': 'Alignment',
		children: [
			jsx(ToggleGroupItem, { children: 'Left', value: 'left' }),
			jsx(ToggleGroupItem, { children: 'Right', size: 'sm', value: 'right' }),
		],
		size: 'lg',
		spacing: 0,
		variant: 'outline',
	}))
	const item = (value: string) => html.match(new RegExp(`<button\\b[^>]*value="${value}"[^>]*>`))?.[0] ?? ''

	expect(item('left')).toMatch(/class="(?=[^"]*\bh-control-lg\b)(?=[^"]*\bedge\b)/)
	expect(item('right')).toMatch(/class="(?=[^"]*\bh-control-sm\b)(?=[^"]*\bedge\b)/)
	expect(html).toMatch(/<div class="contents [^"]*:not\(:first-child\)\]:rounded-s-none[^"]*"><button\b/)
	expect(html).not.toContain('first:rounded-s-md')
	expect(html).toContain('gap:0rem')
})
