// @vitest-environment happy-dom
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, expect, test } from 'vitest'
import { Toaster, toast } from '../src/toast'

const settle = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms))

const toasts = () => Array.from(document.querySelectorAll<HTMLElement>('[data-slot="toast"]'))

afterEach(async () => {
	toast.dismiss()
	await settle(250)
	render(null, document.body)
	document.body.replaceChildren()
})

test('toast() with an id updates one record in place and toast.dismiss(id) closes it', async () => {
	render(jsx(Toaster, { duration: 0 }), document.body)

	const id = toast('Saving', { id: 'save' })
	await settle()
	expect(id).toBe('save')
	expect(toast.success('Saved', { id })).toBe('save')
	await settle()

	expect(toasts()).toHaveLength(1)
	expect(toasts()[0].textContent).toContain('Saved')
	expect(toasts()[0].textContent).not.toContain('Saving')

	toast('Other', { id: 'other' })
	await settle()
	toast.dismiss(id)
	await settle()
	const byId = (key: string) => toasts().find(node => node.dataset.toastId === key)
	expect(byId('save')?.dataset.closing).toBe('true')
	expect(byId('other')?.dataset.closing).toBe('false')
	await settle(250)
	expect(toasts().map(node => node.dataset.toastId)).toEqual(['other'])
})

test('one Toaster renders each position in its own viewport and derives role and tone from the kind', async () => {
	render(jsx(Toaster, { duration: 0 }), document.body)
	await settle()

	// Every position's live region exists, empty, before its first toast.
	const viewport = (at: string) => document.querySelector<HTMLElement>(`[data-slot="toast-viewport"][data-position="${at}"]`)
	const before = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'].map(viewport)
	expect(before.every(node => node && !node.children.length)).toBe(true)

	toast('Default corner')
	toast('Left', { position: 'top-left' })
	toast.error('Failed', { position: 'top-center' })
	await settle()

	const [left, top, corner] = ['top-left', 'top-center', 'bottom-right'].map(at => {
		expect(viewport(at)).toBe(before.find(node => node?.dataset.position === at))
		return viewport(at)!.querySelector<HTMLElement>('[data-slot="toast"]')
	})
	expect(left?.textContent).toContain('Left')
	expect(left?.getAttribute('role')).toBe('status')
	expect(corner?.textContent).toContain('Default corner')
	expect(corner?.getAttribute('role')).toBe('status')
	expect(top?.textContent).toContain('Failed')
	expect(top?.getAttribute('role')).toBe('alert')
	expect(top?.dataset.variant).toBe('danger')
})

test('toast.promise turns its loading toast into the settled result', async () => {
	render(jsx(Toaster, {}), document.body)

	const done = toast.promise(Promise.resolve('Event'), {
		error: 'Failed',
		loading: 'Loading',
		success: (name: string) => `${name} created`,
	})
	await settle()
	expect(await done).toBe('Event')
	await settle()

	expect(toasts()).toHaveLength(1)
	expect(toasts()[0].textContent).toContain('Event created')
})
