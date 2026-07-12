// @vitest-environment happy-dom
import type { Host } from 'ajo-cloves'
import { render } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { label } from 'ajo-cloves'

type View = ReturnType<typeof label>

const prepare = () => {
	if (!globalThis.MutationObserver) globalThis.MutationObserver = window.MutationObserver
	document.body.textContent = ''
}

const tick = () => new Promise<void>(resolve => queueMicrotask(resolve))

const missing = () => new Error('missing value')

const needHost = (value: Host | null): Host => {
	if (value == null) throw missing()
	return value
}

const needView = (value: View | undefined): View => {
	if (value == null) throw missing()
	return value
}

const input = () => {
	const element = document.querySelector('input')
	if (!element) throw missing()
	return element
}

const Description = ({ view }: { view: View }) => {
	view.describe(true)
	return jsx('p', { ...view.descriptionAttrs, children: 'Help' })
}

beforeEach(prepare)

afterEach(() => {
	render(null, document.body)
	document.body.textContent = ''
})

test('shape has exactly the documented fields', () => {
	let view: View | undefined

	function* Gen(this: Host) {
		view = label(this, () => 'unit-label-shape')
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	expect(Object.keys(needView(view))).toEqual([
		'ids',
		'sync',
		'describe',
		'labelAttrs',
		'controlAttrs',
		'buttonAttrs',
		'groupAttrs',
		'descriptionAttrs',
		'errorAttrs',
		'reset',
	])
})

test('ids and label attrs use deterministic field suffixes', () => {
	let view: View | undefined

	function* Gen(this: Host) {
		view = label(this, () => 'unit-label-ids')
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	expect(needView(view).ids).toEqual({
		control: 'unit-label-ids-1',
		label: 'unit-label-ids-1-label',
		description: 'unit-label-ids-1-description',
		error: 'unit-label-ids-1-error',
	})
	expect(needView(view).labelAttrs).toEqual({
		id: 'unit-label-ids-1-label',
		for: 'unit-label-ids-1',
	})
})

test('control attrs omit relationship attrs when no description or error is present', () => {
	let view: View | undefined

	function* Gen(this: Host) {
		view = label(this, () => 'unit-label-empty')
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	expect(needView(view).controlAttrs.id).toBe('unit-label-empty-1')
	expect(needView(view).controlAttrs['aria-describedby']).toBeUndefined()
	expect(needView(view).controlAttrs['aria-invalid']).toBeUndefined()
	expect(needView(view).controlAttrs['aria-errormessage']).toBeUndefined()
})

test('describe true wires earlier controls after one queued render', async () => {
	let view: View | undefined
	let renders = 0

	function* Gen(this: Host) {
		view = label(this, () => 'unit-label-describe')

		while (true) {
			needView(view).reset()
			renders++

			yield jsx('div', {
				children: [
					jsx('input', { ...needView(view).controlAttrs }),
					jsx(Description, { view: needView(view) }),
				],
			})
		}
	}

	render(jsx(Gen, {}), document.body)

	expect(input().getAttribute('aria-describedby')).toBeNull()

	await tick()

	expect(renders).toBe(2)
	expect(input().getAttribute('aria-describedby')).toBe('unit-label-describe-1-description')
})

test('reset plus a missing description removes describedby after one queued render', async () => {
	let host: Host | null = null
	let view: View | undefined
	let show = true

	function* Gen(this: Host) {
		view = label(this, () => 'unit-label-toggle')

		while (true) {
			needView(view).reset()

			yield jsx('div', {
				children: [
					jsx('input', { ...needView(view).controlAttrs }),
					show ? jsx(Description, { view: needView(view) }) : null,
				],
			})
		}
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)
	await tick()

	expect(input().getAttribute('aria-describedby')).toBe('unit-label-toggle-1-description')

	needHost(host).next(() => {
		show = false
	})

	expect(input().getAttribute('aria-describedby')).toBe('unit-label-toggle-1-description')

	await tick()

	expect(input().getAttribute('aria-describedby')).toBeNull()
})

test('repeated describe true calls schedule no extra invalidations', async () => {
	let view: View | undefined
	let renders = 0

	function* Gen(this: Host) {
		view = label(this, () => 'unit-label-repeat')

		while (true) {
			needView(view).reset()
			renders++

			yield jsx('div', {
				children: [
					jsx('input', { ...needView(view).controlAttrs }),
					jsx(Description, { view: needView(view) }),
					jsx(Description, { view: needView(view) }),
				],
			})
		}
	}

	render(jsx(Gen, {}), document.body)

	await tick()
	await tick()

	expect(renders).toBe(2)
	expect(input().getAttribute('aria-describedby')).toBe('unit-label-repeat-1-description')
})

test('sync true marks controls invalid and joins description plus error ids', () => {
	let view: View | undefined

	function* Gen(this: Host) {
		view = label(this, () => 'unit-label-invalid')
		needView(view).describe(true)
		needView(view).sync(true)
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	expect(needView(view).controlAttrs).toEqual({
		id: 'unit-label-invalid-1',
		'aria-describedby': 'unit-label-invalid-1-description unit-label-invalid-1-error',
		'aria-invalid': 'true',
		'aria-errormessage': 'unit-label-invalid-1-error',
	})
})

test('button and group attrs expose the accessible relationship shapes', () => {
	let view: View | undefined

	function* Gen(this: Host) {
		view = label(this, () => 'unit-label-surfaces')
		needView(view).describe(true)
		needView(view).sync(true)
		yield jsx('span', { children: 'ready' })
	}

	render(jsx(Gen, {}), document.body)

	expect(needView(view).buttonAttrs).toEqual({
		id: 'unit-label-surfaces-1',
		'aria-describedby': 'unit-label-surfaces-1-description unit-label-surfaces-1-error',
		'aria-invalid': 'true',
		'aria-errormessage': 'unit-label-surfaces-1-error',
		'aria-labelledby': 'unit-label-surfaces-1-label',
	})
	expect(needView(view).groupAttrs).toEqual({
		'aria-labelledby': 'unit-label-surfaces-1-label',
		'aria-describedby': 'unit-label-surfaces-1-description unit-label-surfaces-1-error',
	})
	expect(needView(view).descriptionAttrs).toEqual({ id: 'unit-label-surfaces-1-description' })
	expect(needView(view).errorAttrs).toEqual({ id: 'unit-label-surfaces-1-error' })
})

test('SSR emits label, description, and invalid error relationships without DOM access', () => {
	function* Gen(this: Host) {
		const view = label(this, () => 'unit-label-ssr')
		view.reset()
		view.describe(true)
		view.sync(true)

		yield jsx('section', {
			children: [
				jsx('label', { ...view.labelAttrs, children: 'Email' }),
				jsx('input', { ...view.controlAttrs }),
				jsx('p', { ...view.descriptionAttrs, children: 'Help' }),
				jsx('div', { ...view.errorAttrs, children: 'Required' }),
			],
		})
	}

	const html = ssr(jsx(Gen, {}))

	expect(html).toContain('<label id="unit-label-ssr-1-label" for="unit-label-ssr-1">Email</label>')
	expect(html).toContain('<input id="unit-label-ssr-1" aria-describedby="unit-label-ssr-1-description unit-label-ssr-1-error" aria-invalid="true" aria-errormessage="unit-label-ssr-1-error">')
	expect(html).toContain('<p id="unit-label-ssr-1-description">Help</p>')
	expect(html).toContain('<div id="unit-label-ssr-1-error">Required</div>')
})

test('reset recreates ids and unmount ignores queued invalidations', async () => {
	let host: Host | null = null
	let view: View | undefined
	let created = 0

	function* Gen(this: Host) {
		created++
		view = label(this, () => 'unit-label-reset')

		while (true) {
			needView(view).reset()
			yield jsx('input', { ...needView(view).controlAttrs })
		}
	}

	render(jsx(Gen, { ref: (element: unknown) => host = element as Host | null }), document.body)

	expect(input().id).toBe('unit-label-reset-1')

	needHost(host).return()
	needHost(host).next()

	expect(created).toBe(2)
	expect(input().id).toBe('unit-label-reset-2')

	needView(view).describe(true)
	render(null, document.body)
	await tick()

	expect(document.body.textContent).toBe('')
})
