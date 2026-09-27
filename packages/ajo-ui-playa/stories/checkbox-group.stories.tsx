/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from './app'
import { frame, until } from './play'
import { Checkbox } from 'ajo-ui-playa/checkbox'
import { CheckboxGroup, CheckboxGroupItem } from 'ajo-ui-playa/checkbox-group'
import {
	Field,
	FieldDescription,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from 'ajo-ui-playa/field'

/** The icon Playa masks onto a checkbox indicator. */
const glyph = (node: HTMLElement) => getComputedStyle(node).maskImage

// Indicator icons transition in (spring pop with a short delay), so state
// assertions poll until the styles settle instead of reading one frame.

export default {
	title: 'UI/Checkbox Group',
	component: CheckboxGroup,
	args: {
		name: 'toppings',
		defaultValue: ['cheese'],
		disabled: false,
		orientation: 'vertical',
	},
	argTypes: {
		defaultValue: { control: 'multi-select', options: ['cheese', 'mushrooms', 'olives'] },
		disabled: { control: 'boolean' },
		orientation: { control: 'radio', options: ['vertical', 'horizontal'] },
	},
	parameters: {
		docs: { description: 'Native checkbox group composition matching the Ajo Kit Checkbox Group API.' },
	},
} satisfies Meta<typeof CheckboxGroup>

const ToppingOptions = () => (
	<>
		<Field orientation="horizontal">
			<CheckboxGroupItem id="topping-cheese" value="cheese" />
			<FieldLabel for="topping-cheese">Cheese</FieldLabel>
		</Field>
		<Field orientation="horizontal">
			<CheckboxGroupItem id="topping-mushrooms" value="mushrooms" />
			<FieldLabel for="topping-mushrooms">Mushrooms</FieldLabel>
		</Field>
		<Field orientation="horizontal">
			<CheckboxGroupItem id="topping-olives" value="olives" />
			<FieldLabel for="topping-olives">Olives</FieldLabel>
		</Field>
	</>
)

const toppings = ['cheese', 'mushrooms', 'olives']

const SelectAllExample: Stateful = function* () {
	let value = ['cheese']
	const setValue = (next: string[]) => this.next(() => value = next)

	while (true) {
		const all = value.length === toppings.length

		yield (
			<FieldSet class="w-full max-w-sm">
				<FieldLegend>Toppings</FieldLegend>
				<Field orientation="horizontal">
					<Checkbox
						id="toppings-all"
						checked={all}
						set:indeterminate={value.length > 0 && !all}
						onCheckedChange={(checked: boolean) => setValue(checked ? [...toppings] : [])}
					/>
					<FieldLabel for="toppings-all">Select all</FieldLabel>
				</Field>
				<CheckboxGroup name="select-all-toppings" value={value} onValueChange={setValue} class="ps-6">
					{toppings.map(topping => (
						<Field key={topping} orientation="horizontal">
							<CheckboxGroupItem id={`select-all-${topping}`} value={topping} />
							<FieldLabel for={`select-all-${topping}`}>{topping}</FieldLabel>
						</Field>
					))}
				</CheckboxGroup>
				<FieldDescription>Selected: {value.length ? value.join(', ') : 'none'}</FieldDescription>
			</FieldSet>
		)
	}
}

export const Basic: Story<typeof CheckboxGroup> = {
	render: args => (
		<CheckboxGroup {...args}>
			<ToppingOptions />
		</CheckboxGroup>
	),
	play: async ({ canvas }) => {
		await frame(2)
		const group = canvas.querySelector<HTMLElement>('[data-slot="checkbox-group"]')
		const layout = group ? getComputedStyle(group) : null
		if (!group || group.dataset.orientation !== 'vertical' || layout?.display !== 'grid' || layout.gap !== '12px') {
			throw new Error('Vertical CheckboxGroup did not apply the shared orientation recipe')
		}

		const cheese = canvas.querySelector<HTMLInputElement>('#topping-cheese')
		const mushrooms = canvas.querySelector<HTMLInputElement>('#topping-mushrooms')
		if (!cheese || !mushrooms) throw new Error('Basic checkbox group items were not rendered')
		if (!cheese.checked || mushrooms.checked) {
			throw new Error('Basic uncontrolled group rendered the wrong initial checked state')
		}

		mushrooms.click()
		await frame(2)

		if (!mushrooms.checked || !cheese.checked) {
			throw new Error('Basic uncontrolled group did not keep the clicked item checked')
		}

		mushrooms.click()
		await frame(2)

		if (mushrooms.checked || !cheese.checked) {
			throw new Error('Basic uncontrolled group did not uncheck the toggled item')
		}
	},
}

export const Form: Story<typeof CheckboxGroup> = {
	args: { defaultValue: ['cheese', 'olives'] },
	render: args => (
		<form set:onsubmit={(event: Event) => event.preventDefault()}>
			<CheckboxGroup {...args}>
				<ToppingOptions />
			</CheckboxGroup>
		</form>
	),
	play: async ({ canvas }) => {
		await frame(2)

		const form = canvas.querySelector('form')
		if (!form) throw new Error('Form story did not render a form')

		if (new FormData(form).getAll('toppings').join(',') !== 'cheese,olives') {
			throw new Error('Form did not submit the default checked values as repeated names')
		}

		canvas.querySelector<HTMLInputElement>('#topping-mushrooms')?.click()
		await frame(2)

		if (new FormData(form).getAll('toppings').join(',') !== 'cheese,mushrooms,olives') {
			throw new Error('Form did not include the newly checked value')
		}
	},
}

export const Horizontal: Story<typeof CheckboxGroup> = {
	args: {
		name: 'horizontal-toppings',
		orientation: 'horizontal',
	},
	render: (args, { setArg }) => (
		<CheckboxGroup {...args} onValueChange={next => setArg('defaultValue', next)}>
			<ToppingOptions />
		</CheckboxGroup>
	),
	play: async ({ canvas }) => {
		const group = canvas.querySelector<HTMLElement>('[data-slot="checkbox-group"]')
		const layout = group ? getComputedStyle(group) : null
		if (!group || group.dataset.orientation !== 'horizontal' || layout?.display !== 'flex' || layout.flexWrap !== 'wrap' || layout.gap !== '12px') {
			throw new Error('Horizontal CheckboxGroup did not apply the shared orientation recipe')
		}
	},
}

export const VisualParity: Story = {
	render: () => (
		<div class="flex items-center gap-6">
			<Checkbox aria-invalid="true" checked />
			<CheckboxGroup value={['group']}>
				<CheckboxGroupItem aria-invalid="true" value="group" />
			</CheckboxGroup>
		</div>
	),
	play: async ({ canvas }) => {
		await frame(2)
		const standalone = canvas.querySelector<HTMLElement>('[data-slot="checkbox"]')
		const grouped = canvas.querySelector<HTMLElement>('[data-slot="checkbox-group-item"]')
		if (!standalone || !grouped) throw new Error('Checkbox parity controls were not rendered')

		const signature = (node: HTMLElement) => {
			const style = getComputedStyle(node)
			const rect = node.getBoundingClientRect()
			return [rect.width, rect.height, style.borderRadius, style.backgroundColor, style.color, style.boxShadow]
		}
		if (JSON.stringify(signature(standalone)) !== JSON.stringify(signature(grouped))) {
			throw new Error('CheckboxGroupItem visual chrome drifted from Checkbox')
		}

		for (const root of [standalone, grouped]) {
			const input = root.querySelector<HTMLInputElement>('[data-slot="checkbox-input"]')
			const indicator = root.querySelector<HTMLElement>('[data-slot="checkbox-indicator"]')
			if (!input || !indicator) throw new Error('Checkbox parity input or indicator was not rendered')
			const rootRect = root.getBoundingClientRect()
			const inputRect = input.getBoundingClientRect()
			const inputStyle = getComputedStyle(input)
			if (
				inputStyle.position !== 'absolute'
				|| inputStyle.opacity !== '0'
				|| Math.abs(inputRect.width - rootRect.width) > 1
				|| Math.abs(inputRect.height - rootRect.height) > 1
				|| document.elementFromPoint(rootRect.left + rootRect.width / 2, rootRect.top + rootRect.height / 2) !== input
			) {
				throw new Error('Checkbox visual did not preserve the shared native input overlay')
			}
			if (getComputedStyle(indicator).opacity !== '1' || glyph(indicator) === 'none') {
				throw new Error('Checked Checkbox parity indicator did not show its check')
			}
		}
	},
}

export const Disabled: Story<typeof CheckboxGroup> = {
	args: {
		name: 'disabled-toppings',
		defaultValue: ['olives'],
		disabled: true,
	},
	render: (args, { setArg }) => (
		<CheckboxGroup {...args} onValueChange={next => setArg('defaultValue', next)}>
			<ToppingOptions />
		</CheckboxGroup>
	),
	play: async ({ canvas }) => {
		await frame(2)

		const inputs = Array.from(canvas.querySelectorAll<HTMLInputElement>('[data-slot="checkbox-input"]'))
		if (inputs.length !== 3) throw new Error('Disabled checkbox group items were not rendered')
		if (!inputs.every(input => input.disabled)) throw new Error('Disabled group did not disable every item')
	},
}

export const SelectAll: Story = {
	render: () => <SelectAllExample />,
	play: async ({ canvas }) => {
		await frame(2)

		const parent = canvas.querySelector<HTMLInputElement>('#toppings-all')
		const items = Array.from(canvas.querySelectorAll<HTMLInputElement>('[data-slot="checkbox-group-item"] [data-slot="checkbox-input"]'))
		if (!parent || items.length !== 3) throw new Error('Select all story parts were not rendered')
		const parentRoot = parent.closest<HTMLElement>('[data-slot="checkbox"]')
		const indicator = parentRoot?.querySelector<HTMLElement>('[data-slot="checkbox-indicator"]')
		if (!parentRoot || !indicator) throw new Error('Select all parent did not render its indicator')
		const expectStamp = (state: string) => {
			if (parentRoot.dataset.state !== state || parent.hasAttribute('data-state') || parent.hasAttribute('aria-checked')) {
				throw new Error(`Checkbox stamp mismatch: expected ${state} on the host only`)
			}
		}
		if (!parent.indeterminate || parent.checked) {
			throw new Error('Select all parent did not render indeterminate for a partial selection')
		}
		expectStamp('indeterminate')
		await until(() => getComputedStyle(indicator).opacity === '1', 'Indeterminate parent did not show its indicator')
		const mixedGlyph = glyph(indicator)

		parent.click()
		await frame(2)

		if (!parent.checked || parent.indeterminate || !items.every(item => item.checked)) {
			throw new Error('Select all parent did not check every item')
		}
		expectStamp('checked')
		await until(
			() => getComputedStyle(indicator).opacity === '1' && glyph(indicator) !== mixedGlyph,
			'Checked parent did not swap the mixed glyph for the check',
		)

		items[0].click()
		await frame(2)

		if (!parent.indeterminate || items[0].checked) {
			throw new Error('Unchecking one item did not return the parent to indeterminate')
		}
		expectStamp('indeterminate')
		await until(
			() => getComputedStyle(indicator).opacity === '1' && glyph(indicator) === mixedGlyph,
			'Partial selection did not restore the mixed glyph',
		)

		parent.click()
		await frame(2)
		parent.click()
		await frame(2)

		if (parent.checked || parent.indeterminate || items.some(item => item.checked) || !canvas.textContent?.includes('Selected: none')) {
			throw new Error('Select all parent did not clear the selection')
		}
		expectStamp('unchecked')
	},
}
