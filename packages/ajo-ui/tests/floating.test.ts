// @vitest-environment happy-dom
import { expect, test } from 'vitest'
import { contentAttrs, datasetPlacement, triggerAttrs } from '../src/floating'

test('datasetPlacement reads live content placement with family defaults', () => {
	let content: HTMLElement | null = null
	const placement = datasetPlacement(() => content, {
		align: 'start',
		constrain: 'height',
		padding: 8,
		side: 'bottom',
		sideOffset: 6,
	})

	expect(placement.side?.()).toBe('bottom')
	expect(placement.align?.()).toBe('start')
	expect(placement.sideOffset?.()).toBe(6)
	expect(placement.alignOffset?.()).toBe(0)
	expect(placement.padding?.()).toBe(8)
	expect(placement.constrain?.()).toBe('height')

	content = document.createElement('div')
	content.dataset.sidePreference = 'top'
	content.dataset.align = 'end'
	content.dataset.sideOffset = '12'
	content.dataset.alignOffset = '-3'
	content.dataset.collisionPadding = '16'

	expect(placement.side?.()).toBe('top')
	expect(placement.align?.()).toBe('end')
	expect(placement.sideOffset?.()).toBe(12)
	expect(placement.alignOffset?.()).toBe(-3)
	expect(placement.padding?.()).toBe(16)
})

test('contentAttrs stamps the shared popup protocol without optional family deltas', () => {
	expect(contentAttrs({
		align: 'end',
		alignOffset: -2,
		collisionPadding: 12,
		id: 'surface-content',
		open: true,
		popover: 'manual',
		side: 'top',
		sideOffset: 4,
		style: 'color:red',
		tabindex: '-1',
	})).toEqual({
		'data-align': 'end',
		'data-align-offset': -2,
		'data-collision-padding': 12,
		'data-side-offset': 4,
		'data-side-preference': 'top',
		'data-state': 'open',
		id: 'surface-content',
		popover: 'manual',
		style: 'inset:auto;margin:0;color:red',
		tabindex: '-1',
	})

	expect(contentAttrs({ align: 'center', side: 'bottom', sideOffset: 6 })).toEqual({
		'data-align': 'center',
		'data-align-offset': 0,
		'data-side-offset': 6,
		'data-side-preference': 'bottom',
		style: 'inset:auto;margin:0',
	})
})

test('triggerAttrs stamps caller-selected controls and optional popup semantics', () => {
	expect(triggerAttrs({
		controls: 'select-list',
		expanded: true,
		haspopup: 'listbox',
		id: 'custom-trigger',
		open: true,
		triggerId: 'generated-trigger',
	})).toEqual({
		'aria-controls': 'select-list',
		'aria-expanded': 'true',
		'aria-haspopup': 'listbox',
		'data-state': 'open',
		id: 'custom-trigger',
	})

	expect(triggerAttrs({ expanded: false, open: false, triggerId: 'generated-trigger' })).toEqual({
		'aria-expanded': 'false',
		'data-state': 'closed',
		id: 'generated-trigger',
	})

	expect(triggerAttrs({ describedby: 'tooltip-content', open: false })).toEqual({
		'aria-describedby': 'tooltip-content',
		'data-state': 'closed',
	})
})

test('floating attr bags register elements before invoking caller refs', () => {
	const calls: string[] = []
	const trigger = document.createElement('button')
	const content = document.createElement('div')
	const triggerBag = triggerAttrs({
		open: false,
		ref: () => calls.push('trigger-ref'),
		setTrigger: element => calls.push(element === trigger ? 'set-trigger' : 'wrong-trigger'),
	})
	const contentBag = contentAttrs({
		align: 'center',
		ref: () => calls.push('content-ref'),
		setContent: element => calls.push(element === content ? 'set-content' : 'wrong-content'),
		side: 'bottom',
		sideOffset: 4,
	})

	;(triggerBag.ref as (element: HTMLButtonElement | null) => void)(trigger)
	;(contentBag.ref as (element: HTMLDivElement | null) => void)(content)

	expect(calls).toEqual(['set-trigger', 'trigger-ref', 'set-content', 'content-ref'])
})

test('owned optional attrs retain precedence when their contextual value is undefined', () => {
	const trigger = triggerAttrs({ controls: undefined, expanded: false, id: undefined, open: false })
	const content = contentAttrs({
		align: 'center',
		id: undefined,
		open: false,
		popover: undefined,
		side: 'bottom',
		sideOffset: 4,
		tabindex: undefined,
	})

	expect(Object.hasOwn(trigger, 'aria-controls')).toBe(true)
	expect(Object.hasOwn(trigger, 'id')).toBe(true)
	expect(Object.hasOwn(content, 'id')).toBe(true)
	expect(Object.hasOwn(content, 'popover')).toBe(true)
	expect(Object.hasOwn(content, 'tabindex')).toBe(true)
})
