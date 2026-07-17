// @vitest-environment happy-dom
import type { Stateful } from 'ajo'
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
	Menu,
	MenuContent,
	MenuItem,
	MenuSub,
	MenuSubContent,
	MenuSubTrigger,
	MenuTrigger,
} from '../src/menu'
import { nativePopoverHarness } from './native-popover-harness'

type Result = {
	x: number
	y: number
	placement: 'bottom-start'
	strategy: 'fixed'
	middlewareData: Record<string, never>
}

const result = (): Result => ({
	x: 10,
	y: 20,
	placement: 'bottom-start',
	strategy: 'fixed',
	middlewareData: {},
})

const popovers = nativePopoverHarness()
const nativeOffsetParent = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent')

const must = <Element extends HTMLElement>(selector: string) => {
	const element = document.querySelector<Element>(selector)
	if (!element) throw new Error(`Missing ${selector}`)
	return element
}

const key = (target: HTMLElement, value: string) => target.dispatchEvent(new KeyboardEvent('keydown', {
	bubbles: true,
	cancelable: true,
	key: value,
}))

let setSubOpen: (open: boolean) => void = () => {}

const SubPrecommitHarness: Stateful = function* () {
	let open = false
	setSubOpen = next => this.next(() => open = next)

	while (true) yield jsx(Menu, {
		children: [
			jsx(MenuTrigger, { children: 'Root', id: 'precommit-root-trigger', key: 'trigger' }),
			jsx(MenuContent, {
				children: jsx(MenuSub, {
					children: [
						jsx(MenuSubTrigger, { children: 'Tools', key: 'trigger' }),
						jsx(MenuSubContent, {
							children: jsx(MenuItem, { children: 'Child' }),
							key: 'content',
						}),
					],
					key: 'sub',
					onOpenChange: setSubOpen,
					open,
				}),
				key: 'content',
			}),
		],
		defaultOpen: true,
	})
}

const ControlledRootHarness = () => jsx(Menu, {
	children: [
		jsx(MenuTrigger, { children: 'Root', id: 'controlled-root-trigger', key: 'trigger' }),
		jsx(MenuContent, {
			children: jsx(MenuItem, { children: 'Root action' }),
			key: 'content',
		}),
	],
	onOpenChange: () => {},
	open: true,
})

const ControlledSubHarness = () => jsx(Menu, {
	children: [
		jsx(MenuTrigger, { children: 'Root', key: 'trigger' }),
		jsx(MenuContent, {
			children: jsx(MenuSub, {
				children: [
					jsx(MenuSubTrigger, { children: 'Tools', key: 'trigger' }),
					jsx(MenuSubContent, {
						children: jsx(MenuItem, { children: 'Child action' }),
						key: 'content',
					}),
				],
				onOpenChange: () => {},
				open: true,
			}),
			key: 'content',
		}),
	],
	defaultOpen: true,
})

beforeEach(() => {
	document.body.replaceChildren()
	floating.autoUpdate.mockReset()
	floating.computePosition.mockReset()
	floating.computePosition.mockResolvedValue(result())
	floating.autoUpdate.mockImplementation((_reference, _floating, update) => {
		update()
		return vi.fn()
	})

	popovers.install()
	Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
		configurable: true,
		get(this: HTMLElement) { return this.parentElement },
	})
})

afterEach(() => {
	render(null, document.body)
	document.body.replaceChildren()
	popovers.restore()
	if (nativeOffsetParent) Object.defineProperty(HTMLElement.prototype, 'offsetParent', nativeOffsetParent)
	else delete (HTMLElement.prototype as { offsetParent?: unknown }).offsetParent
})

test('a controlled submenu close before first geometry invalidates keyboard focus intent', async () => {
	render(jsx(SubPrecommitHarness, {}), document.body)
	const rootContent = must<HTMLElement>('[data-menu-content="true"]')
	await vi.waitFor(() => expect(rootContent.dataset.state).toBe('open'))

	let resolveFirst!: (value: Result) => void
	let deferred = false
	floating.computePosition.mockImplementation((_reference, floatingElement: HTMLElement) => {
		if (!deferred && floatingElement.dataset.menuSubContent === 'true') {
			deferred = true
			return new Promise<Result>(resolve => resolveFirst = resolve)
		}
		return Promise.resolve(result())
	})
	const trigger = must<HTMLElement>('[data-menu-sub-trigger="true"]')
	const content = must<HTMLElement>('[data-menu-sub-content="true"]')
	let childFocused = false
	const observeFocus = (event: Event) => {
		const target = event.target as HTMLElement | null
		if (target?.matches('[data-item="menu"]') && target.closest('[data-menu-sub-content="true"]')) childFocused = true
	}
	document.addEventListener('focusin', observeFocus)
	trigger.focus()
	key(trigger, 'ArrowRight')
	await vi.waitFor(() => expect(deferred).toBe(true))
	expect(content.matches(':popover-open')).toBe(true)

	setSubOpen(false)
	await vi.waitFor(() => expect(trigger.getAttribute('aria-expanded')).toBe('false'))
	resolveFirst(result())
	await new Promise(resolve => setTimeout(resolve, 0))
	expect(content.matches(':popover-open')).toBe(false)
	const focus = vi.spyOn(HTMLElement.prototype, 'focus')
	setSubOpen(true)
	await vi.waitFor(() => {
		expect(trigger.getAttribute('aria-expanded')).toBe('true')
		expect(content.dataset.state).toBe('open')
	})

	const currentTrigger = must<HTMLElement>('[data-menu-sub-trigger="true"]')
	const currentChild = must<HTMLElement>('[data-menu-sub-content="true"] [data-item="menu"]')
	document.removeEventListener('focusin', observeFocus)
	const focusedSubmenuItem = focus.mock.instances.some(element =>
		(element as HTMLElement).matches('[data-item="menu"]')
		&& Boolean((element as HTMLElement).closest('[data-menu-sub-content="true"]')))
	focus.mockRestore()
	expect(focusedSubmenuItem).toBe(false)
	expect(childFocused).toBe(false)
	expect(document.activeElement).toBe(currentTrigger)
	expect(currentChild.dataset.highlighted).toBeUndefined()
})

test('a rejected controlled root close keeps focus in the still-open menu', async () => {
	render(jsx(ControlledRootHarness, {}), document.body)
	const content = must<HTMLElement>('[data-menu-content="true"]')
	const item = must<HTMLElement>('[data-menu-content="true"] [data-item="menu"]')
	await vi.waitFor(() => expect(content.dataset.state).toBe('open'))
	item.focus()

	key(item, 'Escape')
	await Promise.resolve()
	await Promise.resolve()

	expect(content.matches(':popover-open')).toBe(true)
	expect(document.activeElement).toBe(item)
})

test('a rejected controlled submenu close keeps focus in the still-open submenu', async () => {
	render(jsx(ControlledSubHarness, {}), document.body)
	const content = must<HTMLElement>('[data-menu-sub-content="true"]')
	const item = must<HTMLElement>('[data-menu-sub-content="true"] [data-item="menu"]')
	await vi.waitFor(() => expect(content.dataset.state).toBe('open'))
	item.focus()

	key(item, 'ArrowLeft')
	await Promise.resolve()
	await Promise.resolve()

	expect(content.matches(':popover-open')).toBe(true)
	expect(document.activeElement).toBe(item)
})
