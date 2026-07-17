// @vitest-environment happy-dom
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

const floating = vi.hoisted(() => ({
	autoUpdate: vi.fn(),
	computePosition: vi.fn(),
}))

vi.mock('@floating-ui/dom', async importActual => ({
	...await importActual<typeof import('@floating-ui/dom')>(),
	autoUpdate: floating.autoUpdate,
	computePosition: floating.computePosition,
}))

import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from '../src/context-menu'
import { nativePopoverHarness } from './native-popover-harness'

const popovers = nativePopoverHarness()

const must = <Element extends HTMLElement>(selector: string) => {
	const element = document.querySelector<Element>(selector)
	if (!element) throw new Error(`Missing ${selector}`)
	return element
}

const contextmenu = (target: HTMLElement) => target.dispatchEvent(new MouseEvent('contextmenu', {
	bubbles: true,
	cancelable: true,
	clientX: 24,
	clientY: 32,
}))

const pointerdown = (target: HTMLElement) => target.dispatchEvent(new MouseEvent('pointerdown', {
	bubbles: true,
	cancelable: true,
}))

const escape = (target: HTMLElement) => target.dispatchEvent(new KeyboardEvent('keydown', {
	bubbles: true,
	cancelable: true,
	key: 'Escape',
}))

const view = () => jsx(ContextMenu, {
	children: [
		jsx(ContextMenuTrigger, { children: 'Target', id: 'context-target', key: 'trigger' }),
		jsx(ContextMenuContent, {
			children: jsx(ContextMenuSub, {
				children: [
					jsx(ContextMenuSubTrigger, { children: 'More', key: 'trigger' }),
					jsx(ContextMenuSubContent, {
						children: jsx(ContextMenuItem, { children: 'Child' }),
						key: 'content',
					}),
				],
			}),
			key: 'content',
		}),
	],
})

const rootView = () => jsx(ContextMenu, {
	children: [
		jsx(ContextMenuTrigger, { children: 'Target', id: 'context-target', key: 'trigger' }),
		jsx(ContextMenuContent, {
			children: jsx(ContextMenuItem, { children: 'Action' }),
			key: 'content',
		}),
	],
})

beforeEach(() => {
	document.body.replaceChildren()
	floating.autoUpdate.mockReset()
	floating.computePosition.mockReset()
	floating.computePosition.mockResolvedValue({
		x: 10,
		y: 20,
		placement: 'bottom-start',
		strategy: 'fixed',
		middlewareData: {},
	})
	floating.autoUpdate.mockImplementation((_reference, _floating, update) => {
		update()
		return vi.fn()
	})

	popovers.install()
})

afterEach(() => {
	render(null, document.body)
	document.body.replaceChildren()
	popovers.restore()
})

test('pointer dismissal inside the ContextMenu host closes only the open submenu branch', async () => {
	render(view(), document.body)
	const trigger = must('#context-target')
	const subTrigger = must<HTMLElement>('[data-menu-sub-trigger="true"]')

	contextmenu(trigger)
	await vi.waitFor(() => expect(trigger.getAttribute('aria-expanded')).toBe('true'))
	subTrigger.click()
	await vi.waitFor(() => expect(subTrigger.getAttribute('aria-expanded')).toBe('true'))

	pointerdown(trigger)

	expect(trigger.getAttribute('aria-expanded')).toBe('true')
	expect(subTrigger.getAttribute('aria-expanded')).toBe('false')
})

test('pre-commit Escape restores once and leaves a later outside dismissal with its own focus', async () => {
	type Result = {
		x: number
		y: number
		placement: 'bottom-start'
		strategy: 'fixed'
		middlewareData: Record<string, never>
	}
	let resolveFirst!: (result: Result) => void
	floating.computePosition
		.mockReset()
		.mockReturnValueOnce(new Promise<Result>(resolve => resolveFirst = resolve))
		.mockResolvedValue({
			x: 10,
			y: 20,
			placement: 'bottom-start',
			strategy: 'fixed',
			middlewareData: {},
		})

	render(rootView(), document.body)
	const trigger = must('#context-target')
	const content = must<HTMLElement>('[data-menu-content="true"]')
	const outside = document.createElement('button')
	document.body.append(outside)
	trigger.focus()

	contextmenu(trigger)
	await vi.waitFor(() => expect(content.matches(':popover-open')).toBe(true))
	outside.focus()
	escape(outside)

	await vi.waitFor(() => expect(document.activeElement).toBe(trigger))
	expect(trigger.getAttribute('aria-expanded')).toBe('false')

	resolveFirst({
		x: 10,
		y: 20,
		placement: 'bottom-start',
		strategy: 'fixed',
		middlewareData: {},
	})
	await Promise.resolve()
	await Promise.resolve()

	contextmenu(trigger)
	await vi.waitFor(() => expect(content.dataset.state).toBe('open'))
	outside.focus()
	pointerdown(outside)
	await vi.waitFor(() => expect(content.matches(':popover-open')).toBe(false))
	await Promise.resolve()

	expect(document.activeElement).toBe(outside)
})
