// @vitest-environment happy-dom
import { jsx } from 'ajo/jsx-runtime'
import { expect, test } from 'vitest'
import { label } from 'ajo-cloves'
import { mount, must, serve, tick } from './harness'

type View = ReturnType<typeof label>

const input = () => must(document.querySelector('input'))

const Description = ({ view }: { view: View }) => {
	view.describe(true)
	return jsx('p', { ...view.descriptionAttrs, children: 'Help' })
}

/** Mounts a field that re-registers `descriptions()` description elements on every render. */
const field = (prefix: string, descriptions: () => number) => {
	let renders = 0
	const { host, view } = mount(host => label(host, { prefix: () => prefix }), view => {
		view.reset()
		renders++
		return [
			jsx('input', { key: 'input', ...view.controlAttrs }),
			...Array.from({ length: descriptions() }, (_, index) => jsx(Description, { key: index, view })),
		]
	})
	return { host, view, get renders() { return renders } }
}

test('ids and label attrs use deterministic field suffixes', () => {
	const { view } = mount(host => label(host, { prefix: () => 'unit-label-ids' }))

	expect(view.ids).toEqual({
		control: 'unit-label-ids-1',
		label: 'unit-label-ids-1-label',
		description: 'unit-label-ids-1-description',
		error: 'unit-label-ids-1-error',
	})
	expect(view.labelAttrs).toEqual({
		id: 'unit-label-ids-1-label',
		for: 'unit-label-ids-1',
	})
})

test('control attrs omit relationship attrs when no description or error is present', () => {
	const { view } = mount(host => label(host, { prefix: () => 'unit-label-empty' }))

	expect(view.controlAttrs.id).toBe('unit-label-empty-1')
	expect(view.controlAttrs['aria-describedby']).toBeUndefined()
	expect(view.controlAttrs['aria-invalid']).toBeUndefined()
	expect(view.controlAttrs['aria-errormessage']).toBeUndefined()
})

test('describe true wires earlier controls after one queued render', async () => {
	const ctx = field('unit-label-describe', () => 1)

	expect(input().getAttribute('aria-describedby')).toBeNull()

	await tick()

	expect(ctx.renders).toBe(2)
	expect(input().getAttribute('aria-describedby')).toBe('unit-label-describe-1-description')
})

test('reset plus a missing description removes describedby after one queued render', async () => {
	let show = 1
	const { host } = field('unit-label-toggle', () => show)
	await tick()

	expect(input().getAttribute('aria-describedby')).toBe('unit-label-toggle-1-description')

	host.next(() => show = 0)

	expect(input().getAttribute('aria-describedby')).toBe('unit-label-toggle-1-description')

	await tick()

	expect(input().getAttribute('aria-describedby')).toBeNull()
})

test('repeated describe true calls schedule no extra invalidations', async () => {
	const ctx = field('unit-label-repeat', () => 2)

	await tick()
	await tick()

	expect(ctx.renders).toBe(2)
	expect(input().getAttribute('aria-describedby')).toBe('unit-label-repeat-1-description')
})

test('sync true marks controls invalid and joins description plus error ids', () => {
	const { view } = mount(host => label(host, { prefix: () => 'unit-label-invalid' }))
	view.describe(true)
	view.sync(true)

	expect(view.controlAttrs).toEqual({
		id: 'unit-label-invalid-1',
		'aria-describedby': 'unit-label-invalid-1-description unit-label-invalid-1-error',
		'aria-invalid': 'true',
		'aria-errormessage': 'unit-label-invalid-1-error',
	})
})

test('button and group attrs expose the accessible relationship shapes', () => {
	const { view } = mount(host => label(host, { prefix: () => 'unit-label-surfaces' }))
	view.describe(true)
	view.sync(true)

	expect(view.buttonAttrs).toEqual({
		id: 'unit-label-surfaces-1',
		'aria-describedby': 'unit-label-surfaces-1-description unit-label-surfaces-1-error',
		'aria-invalid': 'true',
		'aria-errormessage': 'unit-label-surfaces-1-error',
		'aria-labelledby': 'unit-label-surfaces-1-label',
	})
	expect(view.groupAttrs).toEqual({
		'aria-labelledby': 'unit-label-surfaces-1-label',
		'aria-describedby': 'unit-label-surfaces-1-description unit-label-surfaces-1-error',
	})
	expect(view.descriptionAttrs).toEqual({ id: 'unit-label-surfaces-1-description' })
	expect(view.errorAttrs).toEqual({ id: 'unit-label-surfaces-1-error' })
})

test('SSR emits label, description, and invalid error relationships without DOM access', () => {
	const html = serve(host => {
		const view = label(host, { prefix: () => 'unit-label-ssr' })
		view.reset()
		view.describe(true)
		view.sync(true)
		return view
	}, view => jsx('section', {
		children: [
			jsx('label', { ...view.labelAttrs, children: 'Email' }),
			jsx('input', { ...view.controlAttrs }),
			jsx('p', { ...view.descriptionAttrs, children: 'Help' }),
			jsx('div', { ...view.errorAttrs, children: 'Required' }),
		],
	}))

	expect(html).toContain('<label id="unit-label-ssr-1-label" for="unit-label-ssr-1">Email</label>')
	expect(html).toContain('<input id="unit-label-ssr-1" aria-describedby="unit-label-ssr-1-description unit-label-ssr-1-error" aria-invalid="true" aria-errormessage="unit-label-ssr-1-error">')
	expect(html).toContain('<p id="unit-label-ssr-1-description">Help</p>')
	expect(html).toContain('<div id="unit-label-ssr-1-error">Required</div>')
})
