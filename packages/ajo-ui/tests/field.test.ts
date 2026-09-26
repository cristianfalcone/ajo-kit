// @vitest-environment happy-dom
import { render, type Children, type Stateful, type Stateless } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, expect, test } from 'vitest'
import { Checkbox } from '../src/checkbox'
import { CheckboxGroup, CheckboxGroupItem } from '../src/checkbox-group'
import { Field, FieldContext, FieldDescription, FieldError, FieldLabel } from '../src/field'
import { InputDate } from '../src/input-date'
import { InputGroup, InputGroupInput, InputGroupTextarea } from '../src/input-group'
import { InputOTP } from '../src/input-otp'
import { RadioGroup, RadioGroupItem } from '../src/radio-group'
import { Select, SelectInput, SelectTrigger } from '../src/select'
import { Switch } from '../src/switch'

const tick = () => new Promise<void>(resolve => queueMicrotask(resolve))

const must = <T>(value: T | null | undefined) => {
	if (value == null) throw new Error('expected element')
	return value
}

const field = (name: string, control: Children, invalid = true) => jsx(Field, {
	invalid,
	name,
	children: [
		jsx(FieldLabel, { key: 'label', children: 'Label' }),
		control,
		jsx(FieldDescription, { key: 'description', children: 'Help' }),
		jsx(FieldError, { key: 'error', children: 'Wrong' }),
	],
})

const mount = async (children: Children) => {
	render(children, document.body)
	await tick()
}

const part = (slot: string) => must(document.querySelector<HTMLElement>(`[data-slot="${slot}"]`))

/** The label, description, and error of the one mounted field, as the control must reference them. */
const expectWired = (control: HTMLElement, { labelledby = false } = {}) => {
	const label = part('field-label')
	const description = part('field-description')
	const error = part('field-error')

	expect(label.getAttribute('for')).toBe(control.id)
	expect(control.getAttribute('aria-describedby')).toBe(`${description.id} ${error.id}`)
	expect(control.getAttribute('aria-invalid')).toBe('true')
	expect(control.getAttribute('aria-errormessage')).toBe(error.id)
	expect(control.getAttribute('aria-labelledby')).toBe(labelledby ? label.id : null)
}

afterEach(() => {
	render(null, document.body)
	document.body.replaceChildren()
})

const controls: Array<[string, () => Children, string]> = [
	['Checkbox', () => jsx(Checkbox, {}), 'checkbox-input'],
	['Switch', () => jsx(Switch, {}), 'switch-input'],
	['InputOTP', () => jsx(InputOTP, {}), 'input-otp-input'],
	['InputGroupInput', () => jsx(InputGroup, { children: jsx(InputGroupInput, {}) }), 'input-group-control'],
	['InputGroupTextarea', () => jsx(InputGroup, { children: jsx(InputGroupTextarea, {}) }), 'input-group-control'],
	['SelectInput', () => jsx(Select, { children: jsx(SelectInput, {}) }), 'select-input'],
]

test.each(controls)('%s is the field control without Playa', async (_name, control, slot) => {
	await mount(field(`unit-field-${slot}`, control()))

	const element = part(slot)
	expect(element.id).toMatch(/^unit-field-/)
	expectWired(element)
})

test('a caller id wins over the field id', async () => {
	await mount(field('unit-field-manual', jsx(Checkbox, { id: 'manual-control' })))

	const control = part('checkbox-input')
	expect(control.id).toBe('manual-control')
	expect(control.getAttribute('aria-describedby')).toBe(`${part('field-description').id} ${part('field-error').id}`)
})

test('SelectTrigger is the field control, named by the label', async () => {
	await mount(field('unit-field-trigger', jsx(Select, { children: jsx(SelectTrigger, { children: 'Pick' }) })))

	expectWired(part('select-trigger'), { labelledby: true })
})

test.each([
	['CheckboxGroup', () => jsx(CheckboxGroup, { children: jsx(CheckboxGroupItem, { value: 'a' }) }), 'checkbox-group'],
	['RadioGroup', () => jsx(RadioGroup, { children: jsx(RadioGroupItem, { value: 'a' }) }), 'radio-group'],
] as Array<[string, () => Children, string]>)('%s is the labelled group and its items are not the field control', async (_name, group, slot) => {
	await mount(field(`unit-field-${slot}`, group()))

	const root = part(slot)
	expect(root.getAttribute('aria-labelledby')).toBe(part('field-label').id)
	expect(root.getAttribute('aria-describedby')).toBe(`${part('field-description').id} ${part('field-error').id}`)
	expect(document.querySelector(`#${part('field-label').getAttribute('for')}`)).toBeNull()
	expect(root.querySelector('input')?.hasAttribute('aria-invalid')).toBe(false)
})

test('InputDate marks its root invalid inside an invalid field', async () => {
	await mount(field('unit-field-date', jsx(InputDate, {})))
	expect(part('input-date').getAttribute('aria-invalid')).toBe('true')

	render(null, document.body)
	await mount(field('unit-field-date-valid', jsx(InputDate, {}), false))
	expect(part('input-date').hasAttribute('aria-invalid')).toBe(false)
})

test('ids use the field name as prefix and the label points at the control', async () => {
	await mount(field('unit-field-ids', jsx(Checkbox, {})))

	expect(part('checkbox-input').id).toBe('unit-field-ids-1')
	expect(part('field-label').id).toBe('unit-field-ids-1-label')
	expect(part('field-description').id).toBe('unit-field-ids-1-description')
	expect(part('field-error').id).toBe('unit-field-ids-1-error')
})

test('a valid field without a description adds no relationship attributes', async () => {
	await mount(jsx(Field, { name: 'unit-field-plain', children: jsx(Checkbox, {}) }))

	const control = part('checkbox-input')
	expect(control.hasAttribute('aria-describedby')).toBe(false)
	expect(control.hasAttribute('aria-invalid')).toBe(false)
	expect(control.hasAttribute('aria-errormessage')).toBe(false)
})

/** A field whose description count changes, rendered by an owner that counts control renders. */
const described = (initial: number) => {
	let renders = 0
	let count = initial
	let owner: { next: (fn?: () => void) => unknown } | null = null

	const Control: Stateless = () => {
		renders++
		return jsx('input', { ...FieldContext()?.controlAttrs })
	}

	const Owner: Stateful = function* () {
		owner = this
		while (true) yield jsx(Field, {
			name: 'unit-field-describe',
			children: [
				jsx(Control, { key: 'control' }),
				...Array.from({ length: count }, (_, index) => jsx(FieldDescription, { key: index, children: 'Help' })),
			],
		})
	}

	render(jsx(Owner, {}), document.body)
	return {
		get renders() { return renders },
		set: (next: number) => must(owner).next(() => count = next),
	}
}

test('a description rendered after the control wires it after one queued render', async () => {
	const view = described(1)
	const input = must(document.querySelector('input'))
	expect(input.hasAttribute('aria-describedby')).toBe(false)

	await tick()

	expect(view.renders).toBe(2)
	expect(input.getAttribute('aria-describedby')).toBe(part('field-description').id)
})

test('repeated descriptions schedule no extra render', async () => {
	const view = described(2)
	await tick()
	await tick()

	expect(view.renders).toBe(2)
})

test('a description that stops rendering leaves aria-describedby after a microtask', async () => {
	const view = described(1)
	await tick()
	const input = must(document.querySelector('input'))
	expect(input.hasAttribute('aria-describedby')).toBe(true)

	view.set(0)
	expect(input.hasAttribute('aria-describedby')).toBe(true)

	await tick()
	expect(input.hasAttribute('aria-describedby')).toBe(false)
})

test('FieldError renders deduplicated error messages and nothing without them', async () => {
	await mount(jsx(FieldError, { errors: [{ message: 'One' }, undefined, { message: 'Two' }, { message: 'One' }] }))
	expect([...part('field-error-list').querySelectorAll('li')].map(item => item.textContent)).toEqual(['One', 'Two'])
	expect(part('field-error').getAttribute('role')).toBe('alert')

	render(null, document.body)
	await mount(jsx(FieldError, { errors: [{ message: 'Only' }] }))
	expect(part('field-error').textContent).toBe('Only')

	render(null, document.body)
	await mount(jsx(FieldError, { errors: [{}] }))
	expect(document.querySelector('[data-slot="field-error"]')).toBeNull()
})

test('SSR renders the field wiring without DOM access', () => {
	const html = ssr(jsx(Field, {
		invalid: true,
		name: 'unit-field-ssr',
		children: [
			jsx(FieldLabel, { key: 'label', children: 'Email' }),
			jsx(FieldDescription, { key: 'description', children: 'Help' }),
			jsx(InputGroupInput, { key: 'input' }),
			jsx(FieldError, { key: 'error', children: 'Required' }),
		],
	}))

	expect(html).toContain('<label id="unit-field-ssr-1-label" for="unit-field-ssr-1" data-slot="field-label">Email</label>')
	expect(html).toContain('<p id="unit-field-ssr-1-description" data-slot="field-description">Help</p>')
	expect(html).toContain('id="unit-field-ssr-1" aria-describedby="unit-field-ssr-1-description unit-field-ssr-1-error" aria-invalid="true" aria-errormessage="unit-field-ssr-1-error"')
	expect(html).toContain('<div id="unit-field-ssr-1-error" data-slot="field-error" role="alert">Required</div>')
})
