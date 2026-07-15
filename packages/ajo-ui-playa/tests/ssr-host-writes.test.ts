import { defaults, render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { expect, test } from 'vitest'
import { Checkbox } from 'ajo-ui-playa/checkbox'
import { CheckboxGroupItem } from 'ajo-ui-playa/checkbox-group'
import { InputOTP } from 'ajo-ui-playa/input-otp'
import { RadioGroup, RadioGroupItem } from 'ajo-ui-playa/radio-group'
import Spinner from 'ajo-ui-playa/spinner'
import { Toggle } from 'ajo-ui-playa/toggle'

test('SSR renders checkbox state attributes without DOM host writes', () => {
	const html = ssr(jsx(Checkbox, {}))

	expect(html).toMatch(/^<span\b(?=[^>]*data-slot="checkbox")(?=[^>]*data-state="unchecked")[^>]*>/)
	expect(html).toMatch(/<input\b(?=[^>]*data-slot="checkbox-input")(?=[^>]*data-state="unchecked")(?=[^>]*aria-checked="false")[^>]*>/)
})

test('SSR renders mixed checkbox and binary radio state without live DOM sync', () => {
	const checkbox = ssr(jsx(Checkbox, { 'set:indeterminate': true }))
	expect(checkbox).toMatch(/^<span\b(?=[^>]*data-slot="checkbox")(?=[^>]*data-state="indeterminate")[^>]*>/)
	expect(checkbox).toMatch(/<input\b(?=[^>]*data-slot="checkbox-input")(?=[^>]*data-state="indeterminate")(?=[^>]*aria-checked="mixed")[^>]*>/)

	const radio = ssr(jsx(RadioGroup, {
		children: [
			jsx(RadioGroupItem, { value: 'one' }),
			jsx(RadioGroupItem, { value: 'two' }),
		],
		defaultValue: 'one',
	}))
	expect(radio).toMatch(/<span\b(?=[^>]*data-slot="radio-group-item")(?=[^>]*data-state="checked")[^>]*>\s*<input\b(?=[^>]*data-slot="radio-group-input")(?=[^>]*data-state="checked")(?=[^>]*aria-checked="true")(?=[^>]*value="one")[^>]*>/)
	expect(radio).toMatch(/<span\b(?=[^>]*data-slot="radio-group-item")(?=[^>]*data-state="unchecked")[^>]*>\s*<input\b(?=[^>]*data-slot="radio-group-input")(?=[^>]*data-state="unchecked")(?=[^>]*aria-checked="false")(?=[^>]*value="two")[^>]*>/)
})

test('themed controls normalize bare boolean ARIA attributes through ajo-ui utils', () => {
	const checkbox = ssr(jsx(Checkbox, { 'aria-invalid': '' }))
	const item = ssr(jsx(CheckboxGroupItem, { 'aria-invalid': '', value: 'one' }))
	const spinner = ssr(jsx(Spinner, { 'aria-hidden': '' }))

	for (const html of [checkbox, item]) {
		expect(html).toContain('has-[:checked]:bg-danger')
		expect(html).not.toContain('has-[:checked]:bg-primary')
	}
	expect(spinner).not.toContain('aria-label=')
	expect(spinner).not.toContain('class="sr-only"')
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
