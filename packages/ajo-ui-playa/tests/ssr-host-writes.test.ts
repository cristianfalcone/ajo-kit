import { defaults, render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { expect, test } from 'vitest'
import { ButtonGroupSeparator } from 'ajo-ui-playa/button-group'
import { Card, CardHeader } from 'ajo-ui-playa/card'
import { Checkbox } from 'ajo-ui-playa/checkbox'
import { InputOTP } from 'ajo-ui-playa/input-otp'
import { ItemSeparator } from 'ajo-ui-playa/item'
import { PaginationLink } from 'ajo-ui-playa/pagination'
import { RadioGroup, RadioGroupItem } from 'ajo-ui-playa/radio-group'
import { Spinner } from 'ajo-ui-playa/spinner'
import { Toggle } from 'ajo-ui-playa/toggle'

test('SSR renders checkbox state on the host and leaves the native input unmirrored', () => {
	const html = ssr(jsx(Checkbox, {}))
	const checked = ssr(jsx(Checkbox, { defaultChecked: true }))

	expect(html).toMatch(/^<span\b(?=[^>]*data-slot="checkbox")(?=[^>]*data-state="unchecked")[^>]*>/)
	expect(html).toMatch(/<input\b(?=[^>]*data-slot="checkbox-input")(?![^>]*data-state)(?![^>]*aria-checked)(?![^>]*\schecked\b)[^>]*>/)
	expect(checked).toMatch(/^<span\b(?=[^>]*data-state="checked")[^>]*>\s*<input\b(?=[^>]*\schecked\b)(?![^>]*defaultchecked)[^>]*>/)
})

test('SSR renders mixed checkbox and binary radio state without live DOM sync', () => {
	const checkbox = ssr(jsx(Checkbox, { 'set:indeterminate': true }))
	expect(checkbox).toMatch(/^<span\b(?=[^>]*data-slot="checkbox")(?=[^>]*data-state="indeterminate")[^>]*>/)
	expect(checkbox).toMatch(/<input\b(?=[^>]*data-slot="checkbox-input")(?![^>]*data-state)(?![^>]*aria-checked)[^>]*>/)

	const radio = ssr(jsx(RadioGroup, {
		children: [
			jsx(RadioGroupItem, { value: 'one' }),
			jsx(RadioGroupItem, { value: 'two' }),
		],
		defaultValue: 'one',
	}))
	expect(radio).toMatch(/<input\b(?=[^>]*data-slot="radio-group-input")(?=[^>]*\schecked\b)(?=[^>]*value="one")[^>]*>/)
	expect(radio).toMatch(/<input\b(?=[^>]*data-slot="radio-group-input")(?![^>]*\schecked\b)(?=[^>]*value="two")[^>]*>/)
	expect(radio).not.toMatch(/data-state|aria-checked|aria-orientation/)
})

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

test('SSR renders toggle state attributes without DOM host writes', () => {
	const html = ssr(jsx(Toggle, { children: 'Toggle' }))

	expect(html).toMatch(/^<button\b(?=[^>]*data-slot="toggle")(?=[^>]*data-state="off")(?=[^>]*aria-pressed="false")[^>]*>/)
})

test('SSR renders input OTP state attributes without DOM host writes', () => {
	const html = ssr(jsx(InputOTP, {}))

	expect(html).toMatch(new RegExp(`^<${defaults.tag}\\b(?=[^>]*data-slot="input-otp")(?=[^>]*data-state="incomplete")[^>]*>`))
	expect(html).toMatch(/<input\b(?=[^>]*data-slot="input-otp-input")(?=[^>]*data-state="incomplete")[^>]*>/)
})
