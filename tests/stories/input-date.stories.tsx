/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from './app'
import { Field, FieldLabel } from 'ajo-ui-playa/field'
import {
	InputDate,
	InputDateCalendar,
	InputDateContent,
	InputDateField,
	InputDatePresets,
	InputDateTrigger,
	type InputDateRangeValue,
} from 'ajo-ui-playa/input-date'

export default {
	title: 'UI/InputDate',
	component: InputDate,
	parameters: {
		docs: { description: 'Segment-based date field: locale-ordered typed entry, eager constrained commits, and an optional calendar popover.' },
		layout: 'centered',
	},
} satisfies Meta<typeof InputDate>

const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))))

// Deliberately non-asserting: `asserts` would pin literal narrowings across
// the play's sequential re-reads of the same property.
const ensure = (condition: unknown, message: string) => {
	if (!condition) throw new Error(message)
}

const scope = (canvas: HTMLElement, name: string) => {
	const found = canvas.querySelector<HTMLElement>(`[data-story-field="${name}"]`)
	if (!found) throw new Error(`Story scope ${name} was not rendered`)
	return found
}

const group = (box: HTMLElement, side?: 'from' | 'to') => {
	const found = box.querySelector<HTMLElement>(side
		? `[data-slot="input-date-field"][data-side="${side}"]`
		: '[data-slot="input-date-field"]')
	if (!found) throw new Error(`Field group${side ? ` (${side})` : ''} was not rendered`)
	return found
}

const segments = (box: HTMLElement, side?: 'from' | 'to') =>
	Array.from((side ? group(box, side) : box).querySelectorAll<HTMLElement>('[data-segment]'))

const segment = (box: HTMLElement, unit: string, side?: 'from' | 'to') => {
	const found = (side ? group(box, side) : box).querySelector<HTMLElement>(`[data-segment="${unit}"]`)
	if (!found) throw new Error(`Segment ${unit} was not rendered`)
	return found
}

const hidden = (box: HTMLElement, name: string) => {
	const input = box.querySelector<HTMLInputElement>(`input[type="hidden"][name="${name}"]`)
	if (!input) throw new Error(`Hidden input ${name} was not rendered`)
	return input
}

const trigger = (box: HTMLElement) => {
	const found = box.querySelector<HTMLButtonElement>('[data-slot="input-date-trigger"]')
	if (!found) throw new Error('Calendar trigger was not rendered')
	return found
}

const content = (box: HTMLElement) => {
	const found = box.querySelector<HTMLElement>('[data-slot="input-date-content"]')
	if (!found) throw new Error('Popover content was not rendered')
	return found
}

const messageOf = (box: HTMLElement) =>
	box.querySelector<HTMLElement>('[data-slot="input-date-message"]')?.textContent ?? null

const opened = (panel: HTMLElement) => getComputedStyle(panel).display !== 'none'

const active = () => {
	const element = document.activeElement
	if (!(element instanceof HTMLElement)) throw new Error('No element holds focus')
	return element
}

// The spec's verification plan: typing is driven with synthetic beforeinput
// (insertText per key); KeyboardEvent dispatch is only for keydown-handled keys.
const type = async (target: HTMLElement, text: string) => {
	target.focus()
	for (const key of text) {
		const current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
			? document.activeElement
			: target
		current.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, data: key, inputType: 'insertText' }))
		await frame()
	}
}

const erase = async (target: HTMLElement) => {
	target.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'deleteContentBackward' }))
	await frame()
}

const press = async (target: HTMLElement, key: string, init: KeyboardEventInit = {}) => {
	target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, ...init }))
	await frame()
}

const escapeClose = async () => {
	active().dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' }))
	await frame()
}

export const Basic: Story<typeof InputDate> = {
	parameters: {
		docs: { description: 'The 3-line happy path: a label and a typed segmented field, no calendar.' },
	},
	render: () => (
		<div data-story-field="dob">
			<Field class="max-w-sm">
				<FieldLabel>Date of birth</FieldLabel>
				<InputDate name="dob" />
			</Field>
		</div>
	),
	play: async ({ canvas }) => {
		const dob = scope(canvas, 'dob')
		const root = dob.querySelector<HTMLElement>('[data-slot="input-date"]')
		const widthClasses = root?.className.split(/\s+/).filter(token => token.startsWith('w-')) ?? []
		ensure(widthClasses.join(' ') === 'w-full', `InputDate must own one full-width utility, got ${widthClasses.join(' ')}`)
		const value = hidden(dob, 'dob')
		ensure(value.value === '', 'An empty field must serialize an empty hidden input')

		const order = segments(dob).map(item => item.dataset.segment).join(' ')
		ensure(order === 'month day year', `en must order month/day/year, got "${order}"`)
		const month = segment(dob, 'month')
		ensure(month.textContent === 'mm' && month.dataset.placeholder === 'true', 'The empty month segment must show its mm placeholder')

		await type(month, '3')
		ensure(document.activeElement === segment(dob, 'day'), "Month '3' must auto-advance to the day segment")
		await type(active(), '14')
		ensure(document.activeElement === segment(dob, 'year'), "Day '14' must auto-advance to the year segment")
		ensure(value.value === '', 'No commit may fire while the year is still empty')

		// Eager commit: the field commits the moment it becomes complete, and
		// keeps committing on every further keystroke (padded ISO, native parity).
		await type(active(), '2')
		ensure(value.value === '0002-03-14', `The first year digit must commit the padded ISO, got "${value.value}"`)
		await type(active(), '026')
		ensure(value.value === '2026-03-14', `Completing the year must commit 2026-03-14, got "${value.value}"`)
		ensure(segment(dob, 'month').textContent === '3', 'Month segment must display 3')
		ensure(segment(dob, 'day').textContent === '14', 'Day segment must display 14')
		ensure(segment(dob, 'year').textContent === '2026', 'Year segment must display 2026')

		const label = canvas.querySelector<HTMLElement>('[data-slot="field-label"]')
		if (!label) throw new Error('Field label was not rendered')
		label.click()
		await frame()
		ensure(document.activeElement === segment(dob, 'month'), 'Label click must focus the first segment')

		// Single mode keeps the field context: the self-reference chain names
		// each segment "unit, field label" ("month" + "Date of birth").
		const monthSeg = segment(dob, 'month')
		ensure(monthSeg.getAttribute('aria-label') === 'month', 'The segment aria-label must be the unit name')
		const labelledby = monthSeg.getAttribute('aria-labelledby')?.split(' ') ?? []
		ensure(labelledby.length === 2 && labelledby[0] === monthSeg.id, 'aria-labelledby must self-reference the segment first')
		const fieldLabel = document.getElementById(labelledby[1])
		ensure(fieldLabel?.textContent === 'Date of birth', `aria-labelledby must resolve to the field label, got "${fieldLabel?.textContent}"`)
	},
}

export const WithCalendar: Story<typeof InputDate> = {
	parameters: {
		docs: { description: 'The complete date-entry flow in one token: segmented field plus opt-in calendar popover.' },
	},
	render: () => (
		<div data-story-field="checkin">
			<InputDate name="checkin" calendar />
		</div>
	),
	play: async ({ canvas }) => {
		const checkin = scope(canvas, 'checkin')
		const value = hidden(checkin, 'checkin')
		const button = trigger(checkin)
		const panel = content(checkin)
		ensure(!opened(panel), 'Popover was visible before opening')
		ensure(button.getAttribute('aria-expanded') === 'false', 'Trigger must start collapsed')
		ensure(button.getAttribute('aria-controls') === panel.id && button.getAttribute('aria-haspopup') === 'dialog', 'Trigger must describe the calendar dialog')
		ensure(panel.dataset.align === 'start' && panel.dataset.sidePreference === 'bottom' && panel.dataset.sideOffset === '6' && panel.dataset.collisionPadding === '8', 'Calendar dialog must stamp InputDate placement defaults')

		button.click()
		await frame()
		ensure(opened(panel) && button.getAttribute('aria-expanded') === 'true', 'Trigger click must open the calendar popover')

		const days = Array.from(panel.querySelectorAll<HTMLButtonElement>('[data-slot="calendar-day-button"]:not(:disabled)'))
		const day = days.slice(1).find(day => !day.hasAttribute('data-today'))
		const iso = day?.dataset.day
		if (!day || !iso) throw new Error('No non-fallback calendar day was rendered')
		day.click()
		await frame()
		ensure(value.value === iso, `Picking a day must commit ${iso}, got "${value.value}"`)
		ensure(!opened(panel), 'Picking a day must close the popover')
		ensure(segment(checkin, 'year').textContent === iso.slice(0, 4), 'Picked year must fill the year segment')
		ensure(segment(checkin, 'month').textContent === String(Number(iso.slice(5, 7))), 'Picked month must fill the month segment')
		ensure(segment(checkin, 'day').textContent === String(Number(iso.slice(8, 10))), 'Picked day must fill the day segment')

		const month = segment(checkin, 'month')
		month.focus()
		await press(month, 'ArrowDown', { altKey: true })
		ensure(opened(panel), 'Alt+ArrowDown must open the popover from a segment')
		const selectedDay = panel.querySelector<HTMLButtonElement>(`[data-slot="calendar-day-button"][data-day="${iso}"]`)
		ensure(selectedDay?.dataset.state === 'selected', 'Selected CalendarDayButton state must remain available to InputDate')
		ensure(document.activeElement === selectedDay, 'Reopening must autofocus the selected CalendarDayButton')
		await escapeClose()
		ensure(!opened(panel), 'Escape must close the popover')
		ensure(document.activeElement === month, 'Closing a keyboard open must restore focus to the opening segment')

		// Autofocus is once-per-open transition: paging the month or typing
		// with the popover open must not re-steal focus on every render.
		button.click()
		await frame()
		ensure(opened(panel), 'Reopening via the trigger must work')
		const chevron = panel.querySelector<HTMLButtonElement>('[data-slot="calendar-next"]')
		if (!chevron) throw new Error('Calendar next chevron was not rendered')
		chevron.focus()
		chevron.click()
		await frame()
		ensure(active().dataset.slot === 'calendar-next', 'Paging the month must keep focus on the chevron')

		month.focus()
		await type(month, '1')
		ensure(segment(checkin, 'month').textContent === '1', 'The digit must land in the focused segment while open')
		ensure(active() === segment(checkin, 'month'), 'Typing with the popover open must not lose segment focus')

		// Clicking back into the field closes the popover; the click's own
		// focus wins — no restore to the trigger or the opening segment.
		ensure(opened(panel), 'The popover must still be open before the field click')
		const daySeg = segment(checkin, 'day')
		daySeg.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }))
		await frame()
		ensure(!opened(panel), 'A pointerdown on a segment while open must close the popover')
		ensure(active() === segment(checkin, 'day'), "The click's own focus must win over any restore")
	},
}

const stayCommits: (InputDateRangeValue | null)[] = []

export const Range: Story<typeof InputDate> = {
	parameters: {
		docs: { description: 'Range is a mode, not a component: two field groups, a shared popover, progressive emission, bracketed hidden inputs.' },
	},
	render: () => (
		<div data-story-field="stay">
			<InputDate range name="stay" calendar onValueChange={value => { stayCommits.push(value) }} />
		</div>
	),
	play: async ({ canvas }) => {
		const stay = scope(canvas, 'stay')
		ensure(group(stay, 'from') && group(stay, 'to'), 'Range mode must render two field groups')
		ensure(stay.querySelector('[data-slot="input-date-separator"]'), 'Range mode must render the separator literal')
		const fromHidden = hidden(stay, 'stay[from]')
		const toHidden = hidden(stay, 'stay[to]')

		const button = trigger(stay)
		const panel = content(stay)
		button.click()
		await frame()
		ensure(opened(panel), 'Trigger click must open the range calendar')

		const days = Array.from(panel.querySelectorAll<HTMLButtonElement>('[data-slot="calendar-day-button"]:not(:disabled)'))
		ensure(days.length > 21, 'Expected a month grid of enabled days')
		const first = days[7]
		const second = days[20]
		ensure(first.dataset.day && second.dataset.day && first.dataset.day < second.dataset.day, 'Expected chronological day buttons')

		first.click()
		await frame()
		ensure(fromHidden.value === first.dataset.day, `First pick must fill stay[from] with ${first.dataset.day}`)
		ensure(toHidden.value === '', 'stay[to] must stay empty while the range is incomplete')
		const partial = stayCommits[stayCommits.length - 1]
		ensure(partial != null && typeof partial === 'object' && partial.from === first.dataset.day && partial.to === null,
			'Progressive emission must carry { from, to: null } after the first pick')
		ensure(opened(panel), 'The popover must stay open until the range completes')

		second.click()
		await frame()
		ensure(fromHidden.value === first.dataset.day && toHidden.value === second.dataset.day, 'Completing the range must fill both hidden inputs')
		ensure(!opened(panel), 'Completing the range must close the popover')

		// One flat roving list spans both groups: Right from the last from-segment
		// lands on the first to-segment.
		const fromSegments = segments(stay, 'from')
		const lastFrom = fromSegments[fromSegments.length - 1]
		lastFrom.focus()
		await press(lastFrom, 'ArrowRight')
		ensure(document.activeElement === segments(stay, 'to')[0], 'ArrowRight must cross from the last from-segment to the first to-segment')
	},
}

export const DateOfBirth: Story<typeof InputDate> = {
	parameters: {
		docs: { description: 'Distant dates: dropdown caption layout with a bounded year range.' },
	},
	render: () => (
		<div data-story-field="birth">
			<Field class="max-w-sm">
				<FieldLabel>Date of birth</FieldLabel>
				<InputDate name="birth" calendar={{ captionLayout: 'dropdown', fromYear: 1900, toYear: 2026 }} />
			</Field>
		</div>
	),
	play: async ({ canvas }) => {
		const birth = scope(canvas, 'birth')
		const panel = content(birth)
		trigger(birth).click()
		await frame()
		ensure(opened(panel), 'Trigger click must open the calendar popover')

		const dropdowns = panel.querySelector<HTMLElement>('[data-slot="calendar-dropdowns"]')
		if (!dropdowns) throw new Error('Dropdown caption layout must render the dropdowns container')
		ensure(dropdowns.querySelectorAll('[data-slot="select-trigger"]').length === 2, 'Expected month and year dropdowns')
		ensure(dropdowns.querySelector('[data-slot="select-item"][data-value="1900"]'), 'Year dropdown must reach back to fromYear 1900')
		ensure(dropdowns.querySelector('[data-slot="select-item"][data-value="2026"]'), 'Year dropdown must reach toYear 2026')
		ensure(!dropdowns.querySelector('[data-slot="select-item"][data-value="1899"]'), 'Year dropdown must not go below fromYear')

		await escapeClose()
		ensure(!opened(panel), 'Escape must close the popover')
	},
}

export const Keyboard: Story<typeof InputDate> = {
	parameters: {
		docs: { description: 'The segment protocol: digit auto-advance, wrap without carry, backspace digit-walk, and the dynamic Feb day cap.' },
	},
	render: () => (
		<div data-story-field="kb">
			<InputDate name="kb" />
		</div>
	),
	play: async ({ canvas }) => {
		const kb = scope(canvas, 'kb')
		const value = hidden(kb, 'kb')
		const month = segment(kb, 'month')
		const day = segment(kb, 'day')
		const year = segment(kb, 'year')

		// Auto-advance table.
		await type(month, '3')
		ensure(month.textContent === '3', 'Month must display 3')
		ensure(document.activeElement === day, "Month '3' must auto-advance (no further digit fits)")
		await press(active(), 'ArrowLeft')
		ensure(document.activeElement === month, 'ArrowLeft must move back to the month segment')
		await type(month, '1')
		ensure(document.activeElement === month, "Month '1' must wait for a second digit")
		ensure(month.textContent === '1', 'The waiting buffer must display 1')
		await type(month, '2')
		ensure(month.textContent === '12' && document.activeElement === day, "Month '12' must fill and advance")
		await type(day, '4')
		ensure(day.textContent === '4' && document.activeElement === year, "Day '4' must auto-advance")
		await type(year, '2026')
		ensure(value.value === '2026-12-04', `Typing must commit 2026-12-04, got "${value.value}"`)

		// Wrap stepping without carry.
		day.focus()
		await press(day, 'End')
		ensure(day.textContent === '31' && value.value === '2026-12-31', 'End must land the day on its max')
		await press(day, 'ArrowUp')
		ensure(day.textContent === '1', 'Day 31 + ArrowUp must wrap to 1')
		ensure(month.textContent === '12', 'The day wrap must not carry into the month')
		ensure(value.value === '2026-12-01', 'The wrap must commit eagerly')

		// Backspace digit-walk, then retreat from the emptied segment.
		year.focus()
		await press(year, 'Backspace')
		ensure(year.textContent === '202', 'Backspace must strip the last year digit')
		await press(year, 'Backspace')
		await press(year, 'Backspace')
		await press(year, 'Backspace')
		ensure(year.textContent === 'yyyy' && year.dataset.placeholder === 'true', 'The emptied year must show its placeholder')
		ensure(value.value === '', 'Complete going incomplete must empty the hidden input')
		await press(year, 'Backspace')
		ensure(document.activeElement === day, 'Backspace on an empty segment must retreat to the previous one')

		// Dynamic Feb max: unknown year keeps 29 reachable, a known non-leap caps at 28.
		await type(month, '2')
		ensure(month.textContent === '2', 'Month must display 2')
		day.focus()
		ensure(day.getAttribute('aria-valuemax') === '29', 'Feb with an unknown year must cap the day at 29')
		await press(day, 'End')
		ensure(day.textContent === '29', 'End must land on 29 while the year is unknown')
		await press(day, 'ArrowUp')
		ensure(day.textContent === '1', 'Feb day 29 + ArrowUp must wrap to 1')
		await type(year, '2026')
		ensure(value.value === '2026-02-01', `Completing Feb must commit 2026-02-01, got "${value.value}"`)
		ensure(day.getAttribute('aria-valuemax') === '28', 'Feb 2026 must cap the day at 28')
		day.focus()
		await press(day, 'End')
		ensure(day.textContent === '28' && value.value === '2026-02-28', 'End must clamp to the real month length')

		// Alt+arrows never reach spin: with no popup parts composed,
		// Alt+ArrowDown/Up is a pinned no-op, not a step.
		await press(day, 'ArrowUp', { altKey: true })
		ensure(day.textContent === '28' && value.value === '2026-02-28', 'Alt+ArrowUp must not step the segment')
		await press(day, 'ArrowDown', { altKey: true })
		ensure(day.textContent === '28' && value.value === '2026-02-28', 'Alt+ArrowDown without popup parts must be a no-op')
	},
}

export const Locale: Story<typeof InputDate> = {
	parameters: {
		docs: { description: 'The locale owns segment order and the placeholder vocabulary.' },
	},
	render: () => (
		<div class="grid w-80 gap-4">
			<div data-story-field="es">
				<InputDate locale="es-AR" name="es" />
			</div>
			<div data-story-field="ja">
				<InputDate locale="ja-JP" name="ja" />
			</div>
		</div>
	),
	play: async ({ canvas }) => {
		const es = scope(canvas, 'es')
		const esOrder = segments(es).map(item => item.dataset.segment).join(' ')
		ensure(esOrder === 'day month year', `es-AR must order day/month/year, got "${esOrder}"`)
		ensure(segment(es, 'year').textContent === 'aaaa', 'es year placeholder must be aaaa')
		ensure(segment(es, 'day').textContent === 'dd' && segment(es, 'month').textContent === 'mm', 'es day/month placeholders must be dd/mm')

		const ja = scope(canvas, 'ja')
		const jaOrder = segments(ja).map(item => item.dataset.segment).join(' ')
		ensure(jaOrder === 'year month day', `ja-JP must order year/month/day, got "${jaOrder}"`)
		ensure(segment(ja, 'year').textContent === '年', 'ja year placeholder must be 年')
		ensure(segment(ja, 'day').textContent === '日', 'ja day placeholder must be 日')
	},
}

const LocaleFlipExample: Stateful = function* () {
	let locale = 'es-AR'

	while (true) yield (
		<div class="grid w-80 gap-2" data-story-field="locale-flip">
			<InputDate locale={locale} name="locale-flip" />
			<button class="text-sm underline" data-story-action="to-en" type="button" set:onclick={() => this.next(() => locale = 'en-US')}>Switch to en-US</button>
		</div>
	)
}

export const LocaleFlip: Story<typeof InputDate> = {
	parameters: {
		docs: { description: 'Flipping the locale while a segment is focused: the keyed reorder keeps focus on the same unit and the typing buffer is dropped.' },
	},
	render: () => <LocaleFlipExample />,
	play: async ({ canvas }) => {
		const box = scope(canvas, 'locale-flip')
		const before = segments(box).map(item => item.dataset.segment).join(' ')
		ensure(before === 'day month year', `es-AR must order day/month/year, got "${before}"`)

		const month = segment(box, 'month')
		await type(month, '1')
		ensure(month.textContent === '1' && document.activeElement === month, "Month '1' must wait in the buffer")

		const flip = box.querySelector<HTMLButtonElement>('[data-story-action="to-en"]')
		if (!flip) throw new Error('Flip button was not rendered')
		flip.click()
		await frame()

		const after = segments(box).map(item => item.dataset.segment).join(' ')
		ensure(after === 'month day year', `en-US must order month/day/year, got "${after}"`)
		ensure(active().dataset.segment === 'month', 'Focus must ride the keyed reorder and stay on the month unit')

		// The flip dropped the buffer: the next digit starts fresh (2, not 12).
		await type(segment(box, 'month'), '2')
		ensure(segment(box, 'month').textContent === '2', 'The locale flip must drop the typing buffer')
	},
}

const ControlledExample: Stateful = function* () {
	let value: string | null = '2026-05-10'
	let commits: string[] = []

	const change = (next: string | null) => this.next(() => {
		commits = [...commits, next ?? 'null']
		value = next
	})

	while (true) yield (
		<div class="grid w-80 gap-2" data-story-field="controlled">
			<InputDate name="controlled" value={value} onValueChange={change} />
			<div class="flex gap-3">
				<button class="text-sm underline" data-story-action="push" type="button" set:onclick={() => this.next(() => value = '2026-09-05')}>Push 2026-09-05</button>
				<button class="text-sm underline" data-story-action="clear" type="button" set:onclick={() => this.next(() => value = null)}>Clear</button>
			</div>
			<p class="text-sm text-muted-foreground" data-story-commits="controlled">{commits.join(' | ') || 'none'}</p>
		</div>
	)
}

export const Controlled: Story<typeof InputDate> = {
	parameters: {
		docs: { description: 'Echoes of self-emitted values never clobber the typing buffer; genuinely external values re-derive every unit.' },
	},
	render: () => <ControlledExample />,
	play: async ({ canvas }) => {
		const box = scope(canvas, 'controlled')
		const value = hidden(box, 'controlled')
		const month = segment(box, 'month')
		const log = box.querySelector<HTMLElement>('[data-story-commits="controlled"]')
		if (!log) throw new Error('Commit log was not rendered')
		ensure(month.textContent === '5', 'The controlled value must render its month')

		// Echo mid-typing: two commits, buffer intact between them.
		await type(month, '1')
		ensure(log.textContent === '2026-01-10', `Typing '1' must commit 2026-01-10, log reads "${log.textContent}"`)
		ensure(month.textContent === '1', 'The echo must keep the typing buffer (1, not the re-padded value)')
		await type(month, '2')
		ensure(log.textContent === '2026-01-10 | 2026-12-10', `Typing '2' must extend the buffer to 12, log reads "${log.textContent}"`)
		ensure(month.textContent === '12', 'Month must display the committed 12')

		// External push mid-edit re-derives units and drops the buffer.
		await type(month, '1')
		ensure(month.textContent === '1' && log.textContent === '2026-01-10 | 2026-12-10 | 2026-01-10', 'The third keystroke must start a fresh buffer')
		const push = box.querySelector<HTMLButtonElement>('[data-story-action="push"]')
		if (!push) throw new Error('Push button was not rendered')
		push.click()
		await frame()
		ensure(month.textContent === '9', 'An external push must re-derive the month display')
		await type(month, '2')
		ensure(log.textContent === '2026-01-10 | 2026-12-10 | 2026-01-10 | 2026-02-05',
			`The push must drop the buffer, so '2' commits month 02, log reads "${log.textContent}"`)

		// Null clear round-trip.
		const clear = box.querySelector<HTMLButtonElement>('[data-story-action="clear"]')
		if (!clear) throw new Error('Clear button was not rendered')
		clear.click()
		await frame()
		ensure(month.textContent === 'mm' && month.dataset.placeholder === 'true', 'A controlled null must restore placeholders')
		ensure(value.value === '', 'A controlled null must empty the hidden input')
		push.click()
		await frame()
		ensure(month.textContent === '9' && value.value === '2026-09-05', 'Pushing a value after null must refill the segments')
	},
}

const RejectionExample: Stateful = function* () {
	let commits: string[] = []
	const change = (next: string | null) => this.next(() => commits = [...commits, next ?? 'null'])

	while (true) yield (
		<div class="grid w-80 gap-2" data-story-field="rejected">
			<InputDate name="rejected" value="2026-05-10" onValueChange={change} />
			<p class="text-sm text-muted-foreground" data-story-commits="rejected">{commits.join(' | ') || 'none'}</p>
		</div>
	)
}

export const OwnerRejection: Story<typeof InputDate> = {
	parameters: {
		docs: { description: 'An owner that ignores commits wins: the segments revert to the controlled value.' },
	},
	render: () => <RejectionExample />,
	play: async ({ canvas }) => {
		const box = scope(canvas, 'rejected')
		const month = segment(box, 'month')
		const log = box.querySelector<HTMLElement>('[data-story-commits="rejected"]')
		if (!log) throw new Error('Commit log was not rendered')

		await type(month, '1')
		ensure(log.textContent === '2026-01-10', `The commit must still fire, log reads "${log.textContent}"`)
		ensure(month.textContent === '5', 'A rejected commit must revert the month display')
		await type(month, '2')
		ensure(log.textContent === '2026-01-10 | 2026-02-10', 'The revert must also drop the buffer (2, not 12)')
		ensure(month.textContent === '5', 'The second rejected commit must revert as well')
	},
}

const partialCommits: (string | null)[] = []

export const CompleteToIncomplete: Story<typeof InputDate> = {
	parameters: {
		docs: { description: 'Backspacing one segment of a full value emits null: the screen never shows less than the form would submit.' },
	},
	render: () => (
		<div data-story-field="partial">
			<InputDate defaultValue="2026-03-01" name="partial" onValueChange={value => { partialCommits.push(value) }} />
		</div>
	),
	play: async ({ canvas }) => {
		const partial = scope(canvas, 'partial')
		const value = hidden(partial, 'partial')
		const day = segment(partial, 'day')
		ensure(value.value === '2026-03-01', 'defaultValue must serialize on mount')

		day.focus()
		await erase(day)
		ensure(day.textContent === 'dd' && day.dataset.placeholder === 'true', 'Erasing the single digit must empty the day segment')
		ensure(value.value === '', 'Complete going incomplete must empty the hidden input')
		ensure(partialCommits[partialCommits.length - 1] === null, 'Complete going incomplete must emit null')
		ensure(segment(partial, 'month').textContent === '3', 'The other segments must keep their values')
	},
}

export const ConstrainEager: Story<typeof InputDate> = {
	parameters: {
		docs: { description: 'Every mutation of a complete field constrains before it commits: screen, value, and hidden input never diverge.' },
	},
	render: () => (
		<div class="grid w-80 gap-4">
			<div data-story-field="step-clamp">
				<InputDate defaultValue="2026-01-31" name="step-clamp" />
			</div>
			<div data-story-field="type-clamp">
				<InputDate locale="es-AR" name="type-clamp" />
			</div>
		</div>
	),
	play: async ({ canvas }) => {
		// Jan 31 + month step: the clamp commits immediately.
		const step = scope(canvas, 'step-clamp')
		const stepValue = hidden(step, 'step-clamp')
		ensure(stepValue.value === '2026-01-31', 'defaultValue must serialize on mount')
		const stepMonth = segment(step, 'month')
		stepMonth.focus()
		await press(stepMonth, 'ArrowUp')
		ensure(stepValue.value === '2026-02-28', `Jan 31 + month ArrowUp must emit the clamped 2026-02-28, got "${stepValue.value}"`)
		ensure(segment(step, 'day').textContent === '28', 'The day segment must display the clamp')

		// Typed entry keeps transient invalids representable; the completing
		// keystroke clamps. es-AR (d/m/y) lets 30 land before Feb does.
		const typed = scope(canvas, 'type-clamp')
		const typedValue = hidden(typed, 'type-clamp')
		const typedDay = segment(typed, 'day')
		await type(typedDay, '30')
		ensure(typedDay.textContent === '30', 'Day 30 must stay representable while the field is incomplete')
		await type(active(), '2')
		ensure(typedDay.textContent === '30', 'Feb 30 must stay representable while the year is empty')
		await type(active(), '2026')
		ensure(typedValue.value === '2026-02-28', `The completing keystroke must clamp Feb 30, got "${typedValue.value}"`)
		ensure(typedDay.textContent === '28', 'The day segment must display the clamp')
	},
}

export const MinMax: Story<typeof InputDate> = {
	parameters: {
		docs: { description: 'Bounds never block: an out-of-range date commits, stamps aria-invalid, and names the bound in its message.' },
	},
	render: () => (
		<div data-story-field="window">
			<InputDate calendar max="2026-06-30" min="2026-06-01" name="window" />
		</div>
	),
	play: async ({ canvas }) => {
		const window = scope(canvas, 'window')
		const value = hidden(window, 'window')

		await type(segment(window, 'month'), '7102026')
		ensure(value.value === '2026-07-10', `The out-of-range date must still commit, got "${value.value}"`)
		for (const item of segments(window)) {
			ensure(item.getAttribute('aria-invalid') === 'true', `Out-of-range must stamp aria-invalid on the ${item.dataset.segment} segment`)
		}
		ensure(group(window).dataset.invalid === 'true', 'Out-of-range must mark the field group invalid')
		ensure(messageOf(window) === 'Must be Jun 30, 2026 or earlier', `The message must name the bound, got "${messageOf(window)}"`)

		// The same args disable the out-of-range calendar cells.
		const panel = content(window)
		trigger(window).click()
		await frame()
		ensure(opened(panel), 'Trigger click must open the calendar popover')
		const outside = panel.querySelector<HTMLButtonElement>('[data-slot="calendar-day-button"][data-day="2026-07-15"]')
		if (!outside) throw new Error('The calendar must open on the committed month')
		ensure(outside.disabled, 'Days past max must render disabled')
		await escapeClose()
		ensure(!opened(panel), 'Escape must close the popover')
	},
}

export const InForm: Story<typeof InputDate> = {
	parameters: {
		docs: { description: 'Native form integration: ISO serialization, empty submits an empty string, disabled submits nothing, reset restores defaultValue.' },
	},
	render: () => (
		<form class="grid w-80 gap-4" data-story-form="dates">
			<div data-story-field="event">
				<InputDate defaultValue="2026-03-05" name="event" />
			</div>
			<div data-story-field="empty">
				<InputDate name="empty" />
			</div>
			<div data-story-field="off">
				<InputDate defaultValue="2026-04-01" disabled name="off" />
			</div>
		</form>
	),
	play: async ({ canvas }) => {
		const form = canvas.querySelector<HTMLFormElement>('[data-story-form="dates"]')
		if (!form) throw new Error('Form was not rendered')
		const data = new FormData(form)
		ensure(data.get('event') === '2026-03-05', 'The form must serialize the ISO value')
		ensure(data.get('empty') === '', "An empty field must submit ''")
		ensure(!data.has('off'), 'A disabled field must submit nothing')
		ensure(hidden(scope(canvas, 'off'), 'off').disabled, 'The disabled hidden input must carry the disabled attribute')

		const event = scope(canvas, 'event')
		const day = segment(event, 'day')
		day.focus()
		await press(day, 'ArrowUp')
		ensure(new FormData(form).get('event') === '2026-03-06', 'Stepping must update the submitted value')

		form.reset()
		await frame()
		ensure(new FormData(form).get('event') === '2026-03-05', 'Form reset must restore defaultValue')
		ensure(segment(event, 'day').textContent === '5', 'Form reset must restore the segment display')
	},
}

export const Availability: Story<typeof InputDate> = {
	parameters: {
		docs: { description: 'Unavailable values commit and explain invalidity; range gaps invalidate by default and remain visually discontinuous when allowed.' },
	},
	render: () => (
		<div class="grid w-96 gap-5">
			<div data-story-field="unavailable-endpoint">
				<InputDate
					calendar={{ defaultMonth: new Date(2026, 6, 1, 12) }}
					name="unavailable-endpoint"
					unavailable={new Date(2026, 6, 11, 12)}
				/>
			</div>
			<div data-story-field="unavailable-crossing">
				<InputDate
					defaultValue={{ from: '2026-07-10', to: '2026-07-12' }}
					name="unavailable-crossing"
					range
					unavailable={new Date(2026, 6, 11, 12)}
				/>
			</div>
			<div data-story-field="unavailable-gap">
				<InputDate
					allowNonContiguous
					calendar
					defaultValue={{ from: '2026-07-10', to: '2026-07-12' }}
					name="unavailable-gap"
					range
					unavailable={new Date(2026, 6, 11, 12)}
				/>
			</div>
		</div>
	),
	play: async ({ canvas }) => {
		const endpoint = scope(canvas, 'unavailable-endpoint')
		trigger(endpoint).click()
		await frame()
		const endpointDay = content(endpoint).querySelector<HTMLButtonElement>('[data-day="2026-07-11"]')
		if (!endpointDay) throw new Error('Unavailable endpoint was not rendered')
		ensure(!endpointDay.disabled && endpointDay.dataset.unavailable === 'true', 'Unavailable endpoint must stay selectable')
		endpointDay.click()
		await frame()
		ensure(hidden(endpoint, 'unavailable-endpoint').value === '2026-07-11', 'Unavailable endpoint must commit its value')
		ensure(group(endpoint).dataset.invalid === 'true', 'Unavailable endpoint must stamp the field invalid')
		ensure(messageOf(endpoint) === 'This date is unavailable', `Unavailable endpoint message was "${messageOf(endpoint)}"`)

		const crossing = scope(canvas, 'unavailable-crossing')
		ensure(group(crossing, 'from').dataset.invalid === 'true' && group(crossing, 'to').dataset.invalid === 'true', 'A crossing must invalidate both range sides')
		ensure(messageOf(crossing) === 'Range includes unavailable dates', `Crossing message was "${messageOf(crossing)}"`)

		const gap = scope(canvas, 'unavailable-gap')
		ensure(group(gap, 'from').dataset.invalid !== 'true' && group(gap, 'to').dataset.invalid !== 'true', 'allowNonContiguous must suppress crossing invalidity')
		trigger(gap).click()
		await frame()
		const gapDay = content(gap).querySelector<HTMLButtonElement>('[data-day="2026-07-11"]')
		if (!gapDay) throw new Error('Unavailable interior day was not rendered')
		ensure(gapDay.dataset.unavailable === 'true', 'The interior gap must retain unavailable state')
		ensure(!gapDay.dataset.rangeMiddle && gapDay.dataset.state === 'unselected', 'The interior gap must not paint as selected range')
	},
}

export const Clearable: Story<typeof InputDate> = {
	parameters: {
		docs: { description: 'The clear button lives in the trailing addon, only while a value exists, and emits null (both sides in range mode).' },
	},
	render: () => (
		<div class="grid w-96 gap-4">
			<div data-story-field="single-clear">
				<InputDate clearable defaultValue="2026-04-05" name="single-clear" />
			</div>
			<div data-story-field="range-clear">
				<InputDate clearable defaultValue={{ from: '2026-04-05', to: '2026-04-12' }} name="range-clear" range />
			</div>
		</div>
	),
	play: async ({ canvas }) => {
		const single = scope(canvas, 'single-clear')
		const clear = single.querySelector<HTMLButtonElement>('[data-slot="input-date-clear"]')
		if (!clear) throw new Error('The clear button must render while a value exists')
		clear.click()
		await frame()
		ensure(hidden(single, 'single-clear').value === '', 'Clearing must empty the hidden input')
		ensure(segment(single, 'month').dataset.placeholder === 'true', 'Clearing must restore the placeholders')
		ensure(!single.querySelector('[data-slot="input-date-clear"]'), 'The clear button must disappear once empty')
		// The clear button unmounts with the value: focus must not fall to body.
		ensure(document.activeElement === segment(single, 'month'), 'Clearing must refocus the first segment')

		const range = scope(canvas, 'range-clear')
		const rangeClear = range.querySelector<HTMLButtonElement>('[data-slot="input-date-clear"]')
		if (!rangeClear) throw new Error('The range clear button must render while a value exists')
		rangeClear.click()
		await frame()
		ensure(hidden(range, 'range-clear[from]').value === '' && hidden(range, 'range-clear[to]').value === '', 'Clearing a range must empty both sides')
		ensure(!range.querySelector('[data-slot="input-date-clear"]'), 'The range clear button must disappear once empty')
		ensure(document.activeElement === segments(range, 'from')[0], 'Clearing a range must refocus its first segment')
	},
}

const holidayPresets = [
	{ label: 'Christmas', value: '2026-12-25' },
	{ label: 'New year', value: '2027-01-01' },
]

export const Presets: Story<typeof InputDate> = {
	parameters: {
		docs: { description: 'Preset buttons in the popover footer: a pick commits and closes like a calendar pick.' },
	},
	render: () => (
		<div data-story-field="holiday">
			<InputDate calendar name="holiday" presets={holidayPresets} />
		</div>
	),
	play: async ({ canvas }) => {
		const holiday = scope(canvas, 'holiday')
		const value = hidden(holiday, 'holiday')
		const panel = content(holiday)
		trigger(holiday).click()
		await frame()
		ensure(opened(panel), 'Trigger click must open the popover')

		const buttons = Array.from(panel.querySelectorAll<HTMLButtonElement>('[data-slot="input-date-preset"]'))
		ensure(buttons.length === 2, 'Both preset buttons must render in the popover footer')
		const christmas = buttons.find(button => button.textContent?.includes('Christmas'))
		if (!christmas) throw new Error('The Christmas preset was not rendered')
		christmas.click()
		await frame()
		ensure(value.value === '2026-12-25', `The preset must commit its value, got "${value.value}"`)
		ensure(!opened(panel), 'A preset pick must close the popover')
		ensure(segment(holiday, 'month').textContent === '12' && segment(holiday, 'day').textContent === '25', 'The preset must fill the segments')
	},
}

export const MonthNameTyping: Story<typeof InputDate> = {
	parameters: {
		docs: { description: "Letters prefix-match the locale's month names; a repeated first letter cycles its matches." },
	},
	render: () => (
		<div class="grid w-80 gap-4">
			<div data-story-field="en-month">
				<InputDate name="en-month" />
			</div>
			<div data-story-field="es-month">
				<InputDate locale="es-AR" name="es-month" />
			</div>
		</div>
	),
	play: async ({ canvas }) => {
		// The letter buffer is what displays; the matched month rides aria-valuenow.
		const en = scope(canvas, 'en-month')
		const enMonth = segment(en, 'month')
		await type(enMonth, 'j')
		ensure(enMonth.getAttribute('aria-valuenow') === '1', "'j' must match January first")
		await type(enMonth, 'j')
		ensure(enMonth.getAttribute('aria-valuenow') === '6', "A repeated 'j' must cycle to June")
		await type(enMonth, 'u')
		ensure(enMonth.getAttribute('aria-valuenow') === '6', "'ju' must keep June")
		await type(enMonth, 'l')
		ensure(enMonth.getAttribute('aria-valuenow') === '7', "'jul' must land on July")
		ensure(document.activeElement === segment(en, 'day'), 'A unique prefix must auto-advance')
		ensure(enMonth.textContent === '7', 'Leaving the segment must display the matched month number')

		const es = scope(canvas, 'es-month')
		const esMonth = segment(es, 'month')
		await type(esMonth, 'j')
		ensure(esMonth.getAttribute('aria-valuenow') === '6', "es 'j' must match junio first")
		await type(esMonth, 'j')
		ensure(esMonth.getAttribute('aria-valuenow') === '7', "A repeated es 'j' must cycle to julio")
		await type(esMonth, 'j')
		ensure(esMonth.getAttribute('aria-valuenow') === '6', 'The cycle must wrap back to junio')
		segment(es, 'day').focus()
		await frame()
		ensure(esMonth.textContent === '6', 'Blur must flush the letter buffer to the month number')
	},
}

export const PlusMinus: Story<typeof InputDate> = {
	parameters: {
		docs: { description: 'Locale-free stepping: + and - step the focused segment by one.' },
	},
	render: () => (
		<div data-story-field="pm">
			<InputDate defaultValue="2026-07-10" name="pm" />
		</div>
	),
	play: async ({ canvas }) => {
		const pm = scope(canvas, 'pm')
		const value = hidden(pm, 'pm')
		const day = segment(pm, 'day')
		day.focus()
		await press(day, '+')
		ensure(day.textContent === '11' && value.value === '2026-07-11', "'+' must step the day up")
		await press(day, '-')
		ensure(day.textContent === '10' && value.value === '2026-07-10', "'-' must step the day back down")
	},
}

export const InvalidReasons: Story<typeof InputDate> = {
	parameters: {
		docs: { description: 'Reason-coded messages: incomplete names the first missing unit, and a real date clears it.' },
	},
	render: () => (
		<div data-story-field="reasons">
			<InputDate name="reasons" />
		</div>
	),
	play: async ({ canvas }) => {
		const reasons = scope(canvas, 'reasons')
		ensure(messageOf(reasons) === null, 'An all-empty field is valid')

		// Base behavior (checked): the message exposes as soon as the field is
		// partially filled; blur only drops the typing buffer.
		await type(segment(reasons, 'month'), '3')
		ensure(messageOf(reasons) === 'Must include a day', `The incomplete message must name the first missing unit, got "${messageOf(reasons)}"`)
		ensure(segment(reasons, 'month').getAttribute('aria-invalid') === 'true', 'Incomplete must stamp every segment invalid')
		await type(active(), '15')
		ensure(messageOf(reasons) === 'Must include a year', `The message must move to the next missing unit, got "${messageOf(reasons)}"`)
		await type(active(), '2026')
		ensure(messageOf(reasons) === null, 'A complete real date must clear the message')
		ensure(segment(reasons, 'month').getAttribute('aria-invalid') !== 'true', 'A valid field must drop aria-invalid')
	},
}

export const DisabledReadOnly: Story<typeof InputDate> = {
	parameters: {
		docs: { description: 'Disabled is unfocusable and submits nothing; readOnly stays focusable but ignores every edit.' },
	},
	render: () => (
		<div class="grid w-80 gap-4">
			<div data-story-field="frozen">
				<InputDate defaultValue="2026-05-10" disabled name="frozen" />
			</div>
			<div data-story-field="pinned">
				<InputDate defaultValue="2026-05-10" name="pinned" readOnly />
			</div>
		</div>
	),
	play: async ({ canvas }) => {
		const frozen = scope(canvas, 'frozen')
		const frozenRoot = frozen.querySelector<HTMLElement>('[data-slot="input-date"]')
		if (!frozenRoot) throw new Error('Disabled InputDate root was not rendered')
		const frozenStyle = getComputedStyle(frozenRoot)
		ensure(frozenStyle.pointerEvents === 'none' && frozenStyle.opacity === '0.5', 'Disabled InputDate must retain its local inert/opacity chrome')
		ensure(group(frozen).getAttribute('aria-disabled') === 'true', 'The disabled group must carry aria-disabled')
		const frozenMonth = segment(frozen, 'month')
		ensure(!frozenMonth.hasAttribute('tabindex'), 'Disabled segments must be unfocusable')
		ensure(!frozenMonth.hasAttribute('contenteditable'), 'Disabled segments must not be editable')
		ensure(hidden(frozen, 'frozen').disabled, 'The disabled hidden input must carry the disabled attribute')

		const pinned = scope(canvas, 'pinned')
		const pinnedRoot = pinned.querySelector<HTMLElement>('[data-slot="input-date"]')
		if (!pinnedRoot) throw new Error('Read-only InputDate root was not rendered')
		const pinnedMonth = segment(pinned, 'month')
		ensure(pinnedMonth.getAttribute('aria-readonly') === 'true', 'readOnly segments must carry aria-readonly')
		ensure(pinnedMonth.getAttribute('tabindex') === '0', 'readOnly segments must stay focusable')
		const idleShadow = getComputedStyle(pinnedRoot).boxShadow
		pinnedMonth.focus()
		await frame()
		ensure(document.activeElement === pinnedMonth, 'readOnly segments must accept focus')
		ensure(getComputedStyle(pinnedRoot).boxShadow !== idleShadow, 'Focused InputDate segment must activate the shared input-group ring')
		await type(pinnedMonth, '9')
		ensure(pinnedMonth.textContent === '5', 'readOnly must ignore typing')
		await press(pinnedMonth, 'ArrowUp')
		ensure(hidden(pinned, 'pinned').value === '2026-05-10', 'readOnly must ignore stepping')
	},
}

export const RangeReversed: Story<typeof InputDate> = {
	parameters: {
		docs: { description: 'from > to stamps aria-invalid on both sides; the value is emitted as typed, never swapped.' },
	},
	render: () => (
		<div data-story-field="span">
			<InputDate defaultValue={{ from: '2026-07-20', to: '2026-07-10' }} name="span" range />
		</div>
	),
	play: async ({ canvas }) => {
		const span = scope(canvas, 'span')
		ensure(hidden(span, 'span[from]').value === '2026-07-20' && hidden(span, 'span[to]').value === '2026-07-10',
			'A reversed range must submit as typed, never swapped')
		ensure(group(span, 'from').getAttribute('aria-invalid') === 'true', 'The from side must stamp aria-invalid')
		ensure(group(span, 'to').getAttribute('aria-invalid') === 'true', 'The to side must stamp aria-invalid')
		ensure(segments(span, 'from')[0].getAttribute('aria-invalid') === 'true', 'from segments must stamp aria-invalid')
		ensure(segments(span, 'to')[0].getAttribute('aria-invalid') === 'true', 'to segments must stamp aria-invalid')
		ensure(messageOf(span) === 'Start date must be before end date', `The reversed message must render, got "${messageOf(span)}"`)

		// Mutations keep emitting the value as typed while still reversed.
		const toDay = segment(span, 'day', 'to')
		toDay.focus()
		await press(toDay, 'ArrowUp')
		ensure(hidden(span, 'span[to]').value === '2026-07-11', 'A reversed range must keep committing as typed')
		ensure(group(span, 'to').getAttribute('aria-invalid') === 'true', 'The range must stay invalid while reversed')
	},
}

const customPresets = [{ label: 'Mid August', value: '2026-08-15' }]

export const CustomComposition: Story<typeof InputDate> = {
	parameters: {
		docs: { description: 'The explicit anatomy the defaults expand to: field, trigger, content, calendar, and presets hand-composed.' },
	},
	render: () => (
		<div data-story-field="custom">
			<InputDate defaultValue="2026-08-01" name="custom" presets={customPresets}>
				<InputDateField />
				<InputDateTrigger />
				<InputDateContent id="custom-input-date-content">
					<InputDateCalendar />
					<InputDatePresets />
				</InputDateContent>
			</InputDate>
		</div>
	),
	play: async ({ canvas }) => {
		const custom = scope(canvas, 'custom')
		ensure(segments(custom).length === 3, 'The hand-composed field must render its segments')
		const value = hidden(custom, 'custom')
		ensure(value.value === '2026-08-01', 'defaultValue must serialize on mount')

		const panel = content(custom)
		const button = trigger(custom)
		ensure(panel.id === 'custom-input-date-content' && button.getAttribute('aria-controls') === panel.id, 'The hand-composed trigger must reference the adopted content id')
		button.click()
		await frame()
		ensure(opened(panel), 'The hand-composed trigger must open the popover')
		ensure(panel.querySelector('[data-slot="calendar"]'), 'The hand-composed content must render the calendar')
		ensure(panel.querySelector('[data-day="2026-08-20"]'), 'The calendar must open on the committed month')

		const preset = panel.querySelector<HTMLButtonElement>('[data-slot="input-date-preset"]')
		if (!preset) throw new Error('The hand-composed presets must render')
		preset.click()
		await frame()
		ensure(value.value === '2026-08-15', `The preset must commit its value, got "${value.value}"`)
		ensure(!opened(panel), 'A preset pick must close the popover')
	},
}
