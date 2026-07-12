// @vitest-environment happy-dom
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, expect, test, vi } from 'vitest'
import { InputDate, InputTime } from '../src/input-date'

afterEach(() => render(null, document.body))

test('a range crossing an unavailable day invalidates both sides unless gaps are allowed', () => {
	const props = {
		defaultValue: { from: '2026-07-10', to: '2026-07-12' },
		range: true as const,
		unavailable: new Date(2026, 6, 11, 12),
	}
	const invalid = ssr(jsx(InputDate, props))
	const valid = ssr(jsx(InputDate, { ...props, allowNonContiguous: true }))

	expect(invalid.match(/data-invalid="true"/g)?.length).toBeGreaterThanOrEqual(2)
	expect(invalid).toContain('Range includes unavailable dates')
	expect(valid).not.toContain('data-invalid="true"')
	expect(valid).not.toContain('Range includes unavailable dates')
})

test('time-window availability is half-open in the public InputTime field', () => {
	const unavailable = { time: { from: '12:00', to: '13:00' } }
	const lunch = ssr(jsx(InputTime, { defaultValue: '12:30', unavailable }))
	const afterLunch = ssr(jsx(InputTime, { defaultValue: '13:00', unavailable }))

	expect(lunch).toContain('data-invalid="true"')
	expect(lunch).toContain('This time is unavailable')
	expect(afterLunch).not.toContain('data-invalid="true"')
	expect(afterLunch).not.toContain('This time is unavailable')
})

test('an unavailable calendar day remains selectable and commits an invalid endpoint', () => {
	const onValueChange = vi.fn()
	render(jsx(InputDate, {
		calendar: { defaultMonth: new Date(2026, 6, 1, 12) },
		name: 'visit',
		onValueChange,
		unavailable: new Date(2026, 6, 11, 12),
	}), document.body)

	document.querySelector<HTMLButtonElement>('[data-slot="input-date-trigger"]')!.click()
	const unavailable = document.querySelector<HTMLButtonElement>('[data-day="2026-07-11"]')!
	expect(unavailable.disabled).toBe(false)
	expect(unavailable.dataset.unavailable).toBe('true')
	unavailable.click()

	expect(onValueChange).toHaveBeenCalledWith('2026-07-11', expect.any(Event))
	expect(document.querySelector<HTMLInputElement>('input[name="visit"]')?.value).toBe('2026-07-11')
	expect(document.querySelector('[data-slot="input-date-field"]')?.getAttribute('aria-invalid')).toBe('true')
	expect(document.body.textContent).toContain('This date is unavailable')
})

test('range field segments expose one scoped surface with unique control identities', () => {
	const html = ssr(jsx(InputDate, { range: true }))
	const segments = Array.from(html.matchAll(/<div\b[^>]*data-segment="[^"]+"[^>]*>/g), match => match[0])
	const ids = segments.map(tag => tag.match(/\bid="([^"]+)"/)?.[1]).filter(Boolean)

	expect(segments.length).toBeGreaterThan(4)
	expect(segments.every(tag => tag.includes('data-surface="field"'))).toBe(true)
	expect(new Set(ids).size).toBe(ids.length)
})
