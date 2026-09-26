// @vitest-environment happy-dom
import type { Host } from 'ajo'
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { expect, test, vi } from 'vitest'
import { controlled } from 'ajo-cloves'
import { mount, serve } from './harness'

test('reacts to uncontrolled set and controlled sync truth', () => {
	let view: ReturnType<typeof controlled<boolean>> | undefined

	function* Gen(this: Host) {
		view = controlled(this, { fallback: false })

		for (const args of this) {
			view.sync(args.open as boolean | undefined)
			yield jsx('span', { children: view.value ? 'open' : 'closed' })
		}
	}

	render(jsx(Gen, {}), document.body)

	expect(view!.controlled).toBe(false)
	expect(document.body.textContent).toBe('closed')

	view!.set(true)

	expect(view!.value).toBe(true)
	expect(document.body.textContent).toBe('open')

	render(jsx(Gen, { open: false }), document.body)

	expect(view!.controlled).toBe(true)
	expect(view!.value).toBe(false)
	expect(document.body.textContent).toBe('closed')
})

test('init seeds uncontrolled value, invalidates, and ignores controlled views without notifying', () => {
	let view: ReturnType<typeof controlled<string>> | undefined
	let renders = 0
	const onChange = vi.fn()

	function* Gen(this: Host) {
		view = controlled(this, { fallback: 'a', onChange })

		for (const args of this) {
			view.sync(args.value as string | undefined)
			renders++
			yield jsx('span', { children: `${renders}:${view.value}` })
		}
	}

	render(jsx(Gen, {}), document.body)

	view!.init('b')

	expect(view!.value).toBe('b')
	expect(document.body.textContent).toBe('2:b')
	expect(onChange).not.toHaveBeenCalled()

	render(jsx(Gen, { value: 'c' }), document.body)
	view!.init('d')

	expect(view!.value).toBe('c')
	expect(document.body.textContent).toBe('3:c')
	expect(onChange).not.toHaveBeenCalled()
})

test('sync binds null as controlled-empty and undefined as uncontrolled', () => {
	let view: ReturnType<typeof controlled<string | null>> | undefined

	function* Gen(this: Host) {
		view = controlled(this, { fallback: 'local' })

		for (const args of this) {
			view.sync(args.value as string | null | undefined)
			yield jsx('span', { children: view.value ?? 'empty' })
		}
	}

	render(jsx(Gen, {}), document.body)

	expect(view!.controlled).toBe(false)
	expect(document.body.textContent).toBe('local')

	render(jsx(Gen, { value: null }), document.body)

	expect(view!.controlled).toBe(true)
	expect(view!.value).toBe(null)
	expect(document.body.textContent).toBe('empty')

	render(jsx(Gen, {}), document.body)

	expect(view!.controlled).toBe(false)
	expect(document.body.textContent).toBe('local')
})

test('set calls onChange before the live value updates', () => {
	const order: string[] = []
	const { view } = mount(host => {
		const view: ReturnType<typeof controlled<boolean>> = controlled(host, {
			fallback: false,
			onChange: next => order.push(`set:${next}:${view.value}`),
		})
		return view
	}, view => view.value ? 'on' : 'off')

	view.set(true)

	expect(order).toEqual(['set:true:false'])
	expect(view.value).toBe(true)
	expect(document.body.textContent).toBe('on')
})

test('SSR renders without DOM access', () => {
	expect(serve(host => {
		const view = controlled(host, { fallback: 'server' })
		view.sync(undefined)
		return view
	}, view => view.value)).toBe('<div>server</div>')
})
