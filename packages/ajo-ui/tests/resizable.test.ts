// @vitest-environment happy-dom
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../src/resizable'

const group = (id: string, children?: unknown) => jsx(ResizablePanelGroup, {
	children: [
		jsx(ResizablePanel, { children, defaultSize: 50, id: `${id}-first`, key: 'first', minSize: 20 }),
		jsx(ResizableHandle, { id: `${id}-handle`, key: 'handle' }),
		jsx(ResizablePanel, { defaultSize: 50, id: `${id}-second`, key: 'second' }),
	],
	id,
})

const must = (id: string) => {
	const element = document.getElementById(id)
	if (!element) throw new Error(`Missing ${id}`)
	return element
}

const key = (target: HTMLElement, value: string) => target.dispatchEvent(new KeyboardEvent('keydown', {
	bubbles: true,
	cancelable: true,
	key: value,
}))

beforeEach(() => {
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
		const width = this.dataset.slot === 'resizable-panel-group' ? 400 : 200
		return { bottom: 0, height: width, left: 0, right: width, top: 0, width, x: 0, y: 0, toJSON: () => ({}) }
	})
})

afterEach(() => {
	render(null, document.body)
	document.body.replaceChildren()
})

test('Resizable resizes adjacent panels by keyboard and reports only the handle value', () => {
	render(group('outer'), document.body)
	const resized = vi.fn()
	must('outer-first').addEventListener('resize', resized)

	expect(key(must('outer-handle'), 'ArrowRight')).toBe(false)

	expect(must('outer-first').style.flex).toBe('0 0 210px')
	expect(must('outer-second').style.flex).toBe('0 0 190px')
	expect(must('outer-handle').getAttribute('aria-valuenow')).toBe('53')
	expect(resized).not.toHaveBeenCalled()
	expect(document.querySelector('[data-size], [data-panel-group-direction]')).toBeNull()
})

test('Resizable handles resize only their own group', () => {
	render(group('outer', group('inner')), document.body)

	key(must('inner-handle'), 'ArrowLeft')

	expect(must('inner-first').style.flex).toBe('0 0 190px')
	expect(must('outer-first').style.flex).toBe('0 0 50%')
})
