// @vitest-environment happy-dom
import { render, type Stateful, type Stateless } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, expect, test } from 'vitest'
import { Checkbox } from '../src/checkbox'
import { CheckboxGroup, CheckboxGroupItem } from '../src/checkbox-group'
import { Switch } from '../src/switch'

const families: Array<[string, Stateless<any>]> = [['Checkbox', Checkbox], ['Switch', Switch]]

/** Mounts a control owned by a parent that accepts or rejects each change. */
const owned = (control: Stateless<any>, options: { accept: boolean, checked: boolean, indeterminate?: boolean }) => {
	const calls: boolean[] = []
	let set = (_checked: boolean) => {}

	const Owner: Stateful = function* () {
		let { checked, indeterminate } = options
		set = next => this.next(() => {
			checked = next
			indeterminate = false
		})

		while (true) yield jsx(control, {
			checked,
			'set:indeterminate': indeterminate,
			onCheckedChange: (next: boolean) => {
				calls.push(next)
				if (options.accept) set(next)
			},
		})
	}

	render(jsx(Owner, {}), document.body)
	const input = document.querySelector<HTMLInputElement>('input')!
	return { calls, host: input.parentElement!, input, set: (checked: boolean) => set(checked) }
}

afterEach(() => {
	render(null, document.body)
	document.body.replaceChildren()
})

test.each(families)('%s writes each controlled checked change onto the live property', (_name, control) => {
	const { calls, host, input, set } = owned(control, { accept: true, checked: false })

	input.click()
	expect(calls).toEqual([true])
	expect(input.checked).toBe(true)
	expect(host.dataset.state).toBe('checked')

	set(false)
	expect(input.checked).toBe(false)
	expect(host.dataset.state).toBe('unchecked')

	set(true)
	expect(input.checked).toBe(true)
	expect(host.dataset.state).toBe('checked')
})

test.each(families)('%s reverts a change its controlling owner rejects', (_name, control) => {
	const { calls, host, input } = owned(control, { accept: false, checked: false })

	input.click()
	expect(calls).toEqual([true])
	expect(input.checked).toBe(false)
	expect(host.dataset.state).toBe('unchecked')
})

test('Checkbox passes indeterminate through, keeps it on a rejected change and drops it when the owner does', () => {
	const rejected = owned(Checkbox, { accept: false, checked: false, indeterminate: true })
	expect(rejected.input.indeterminate).toBe(true)
	expect(rejected.host.dataset.state).toBe('indeterminate')

	rejected.input.click()
	expect(rejected.input.indeterminate).toBe(true)
	expect(rejected.input.checked).toBe(false)
	expect(rejected.host.dataset.state).toBe('indeterminate')
	render(null, document.body)

	const accepted = owned(Checkbox, { accept: true, checked: false, indeterminate: true })
	accepted.input.click()
	expect(accepted.input.indeterminate).toBe(false)
	expect(accepted.input.checked).toBe(true)
	expect(accepted.host.dataset.state).toBe('checked')
})

test('an uncontrolled Checkbox host follows each indeterminate change its owner renders', () => {
	let set = (_indeterminate: boolean) => {}
	const Owner: Stateful = function* () {
		let indeterminate = false
		set = next => this.next(() => indeterminate = next)
		while (true) yield jsx(Checkbox, { defaultChecked: false, 'set:indeterminate': indeterminate })
	}

	render(jsx(Owner, {}), document.body)
	const input = document.querySelector<HTMLInputElement>('input')!
	const host = input.parentElement!

	set(true)
	expect(input.indeterminate).toBe(true)
	expect(host.dataset.state).toBe('indeterminate')

	set(false)
	expect(input.indeterminate).toBe(false)
	expect(host.dataset.state).toBe('unchecked')

	input.click()
	expect(host.dataset.state).toBe('checked')

	set(true)
	expect(host.dataset.state).toBe('indeterminate')

	set(false)
	expect(input.checked).toBe(true)
	expect(host.dataset.state).toBe('checked')
})

test('a controlled Checkbox reverts even when its change handler throws', () => {
	const errors: unknown[] = []
	const onError = (event: ErrorEvent) => {
		errors.push(event.error)
		event.preventDefault()
	}
	window.addEventListener('error', onError)
	render(jsx(Checkbox, {
		checked: false,
		'set:onchange': () => { throw new Error('handler') },
	}), document.body)
	const input = document.querySelector<HTMLInputElement>('input')!

	try {
		input.click()
	} catch (error) {
		errors.push(error)
	} finally {
		window.removeEventListener('error', onError)
	}
	expect(errors).toHaveLength(1)
	expect(input.checked).toBe(false)
	expect(input.parentElement!.dataset.state).toBe('unchecked')
})

test.each(families)('%s starts from defaultChecked and then follows the native input', (_name, control) => {
	const calls: boolean[] = []
	render(jsx(control, { defaultChecked: true, onCheckedChange: (next: boolean) => calls.push(next) }), document.body)
	const input = document.querySelector<HTMLInputElement>('input')!

	expect(input.checked).toBe(true)
	expect(input.defaultChecked).toBe(true)
	expect(input.hasAttribute('defaultchecked')).toBe(false)
	expect(input.parentElement!.dataset.state).toBe('checked')

	input.click()
	expect(calls).toEqual([false])
	expect(input.checked).toBe(false)
	expect(input.parentElement!.dataset.state).toBe('unchecked')
})

test('a controlled CheckboxGroup reverts an item change it rejects', () => {
	const calls: string[][] = []
	render(jsx(CheckboxGroup, {
		children: jsx(CheckboxGroupItem, { value: 'one' }),
		onValueChange: (value: string[]) => calls.push(value),
		value: [],
	}), document.body)
	const input = document.querySelector<HTMLInputElement>('input')!

	input.click()
	expect(calls).toEqual([['one']])
	expect(input.checked).toBe(false)
})
