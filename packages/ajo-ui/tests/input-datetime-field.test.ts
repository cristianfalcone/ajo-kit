// @vitest-environment happy-dom
import { render, type Stateful } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

const floating = vi.hoisted(() => ({
	autoUpdate: vi.fn(),
	computePosition: vi.fn(),
}))

vi.mock('@floating-ui/dom', async importActual => ({
	...await importActual<typeof import('@floating-ui/dom')>(),
	autoUpdate: floating.autoUpdate,
	computePosition: floating.computePosition,
}))

import { InputDate, InputDateTime, InputTime } from '../src/input-date'
import { nativePopoverHarness } from './native-popover-harness'

const popovers = nativePopoverHarness()

beforeEach(() => {
	popovers.install()
	floating.autoUpdate.mockReset().mockImplementation((_reference, _floating, update) => {
		update()
		return vi.fn()
	})
	floating.computePosition.mockReset().mockResolvedValue({
		x: 10,
		y: 20,
		placement: 'bottom-start',
		strategy: 'fixed',
		middlewareData: {},
	})
})
afterEach(() => {
	render(null, document.body)
	popovers.restore()
})

const segment = (unit: string) => document.querySelector<HTMLElement>(`[data-segment="${unit}"]`)!
const hidden = (name: string) => document.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.value
const openCalendar = async () => {
	document.querySelector<HTMLButtonElement>('[data-slot="input-date-trigger"]')!.click()
	const content = document.querySelector<HTMLElement>('[data-slot="input-date-content"]')!
	await vi.waitFor(() => expect(content.matches(':popover-open')).toBe(true))
	return content
}
const pick = (day: string) => document.querySelector<HTMLButtonElement>(`[data-day="${day}"]`)!.click()

const FamilySwitch: Stateful = function* () {
	let time = false

	while (true) yield jsx('div', {
		children: [
			jsx('button', {
				children: 'Switch family',
				'data-testid': 'switch-family',
				'set:onclick': () => this.next(() => time = true),
				type: 'button',
			}),
			time
				? jsx(InputTime, { defaultValue: '09:30', hourCycle: 24, name: 'family-value' })
				: jsx(InputDate, { defaultValue: '2026-07-10', name: 'family-value' }),
		],
	})
}

test('a datetime field with a calendar renders one editor: one set of hour and minute segments', () => {
	const html = ssr(jsx(InputDateTime, {
		calendar: true,
		defaultValue: '2026-07-10T12:30',
		hourCycle: 24,
	}))
	const tags = Array.from(html.matchAll(/<div\b[^>]*data-segment="[^"]+"[^>]*>/g), match => match[0])
	const ids = tags.map(tag => tag.match(/\bid="([^"]+)"/)?.[1]).filter(Boolean)

	expect(tags.filter(tag => tag.includes('data-segment="hour"'))).toHaveLength(1)
	expect(tags.filter(tag => tag.includes('data-segment="minute"'))).toHaveLength(1)
	expect(html).toContain('data-slot="calendar"')
	expect(new Set(ids).size).toBe(ids.length)
})

test('picking a day seeds empty time units from the placeholder, commits and closes', async () => {
	render(jsx(InputDateTime, {
		calendar: { defaultMonth: new Date(2026, 6, 1, 12) },
		hourCycle: 24,
		name: 'meeting',
		placeholderValue: '2026-01-01T09:15',
	}), document.body)

	const content = await openCalendar()
	pick('2026-07-11')
	expect(hidden('meeting')).toBe('2026-07-11T09:15')
	expect(content.dataset.state).toBe('closed')
	expect(segment('hour').textContent).toBe('09')
})

test('a datetime range picks both ends and then closes, keeping the entered times', async () => {
	render(jsx(InputDateTime, {
		calendar: { defaultMonth: new Date(2026, 6, 1, 12) },
		defaultValue: { from: '2026-07-01T08:00', to: '2026-07-02T18:30' },
		hourCycle: 24,
		name: 'stay',
		range: true,
	}), document.body)

	const content = await openCalendar()
	pick('2026-07-11')
	expect(content.dataset.state).toBe('open')
	pick('2026-07-14')
	expect(hidden('stay[from]')).toBe('2026-07-11T08:00')
	expect(hidden('stay[to]')).toBe('2026-07-14T18:30')
	expect(content.dataset.state).toBe('closed')
})

test('segment stepping keys are prevented and step, page and land on the bounds', () => {
	render(jsx(InputTime, { defaultValue: '09:30', hourCycle: 24, name: 'alarm' }), document.body)

	const hour = segment('hour')
	const value = () => hidden('alarm')
	for (const [key, expected] of [
		['ArrowDown', '08:30'],
		['PageUp', '10:30'],
		['End', '23:30'],
		['Home', '00:30'],
		['ArrowUp', '01:30'],
		['PageDown', '00:30'],
	]) {
		const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key })
		hour.dispatchEvent(event)
		expect(event.defaultPrevented).toBe(true)
		expect(value()).toBe(expected)
	}

	const tab = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Tab' })
	hour.dispatchEvent(tab)
	expect(tab.defaultPrevented).toBe(false)
})

test('switching public field families replaces the kind-specific editing root', () => {
	render(jsx(FamilySwitch, {}), document.body)
	expect(document.querySelector('[data-segment="year"]')).not.toBeNull()
	document.querySelector<HTMLButtonElement>('[data-testid="switch-family"]')!.click()

	expect(document.querySelector('[data-segment="year"]')).toBeNull()
	expect(document.querySelector('[data-segment="hour"]')).not.toBeNull()
	expect(document.querySelector<HTMLInputElement>('input[name="family-value"]')?.value).toBe('09:30')
})
