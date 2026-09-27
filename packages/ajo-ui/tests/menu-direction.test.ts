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

import { DirectionProvider } from '../src/direction'
import { Menu, MenuContent, MenuItem, MenuSub, MenuSubContent, MenuSubTrigger, MenuTrigger } from '../src/menu'
import { Menubar, MenubarMenu, MenubarTrigger } from '../src/menubar'
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuList, NavigationMenuTrigger } from '../src/navigation-menu'
import { nativePopoverHarness } from './native-popover-harness'
import './user-agent-dir'

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

const rtl = (children: unknown) => jsx(DirectionProvider, { children, dir: 'rtl' })

const values = ['file', 'edit', 'view']

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

test('an RTL Menubar steps to the next trigger and the next menu with ArrowLeft', async () => {
	render(rtl(jsx(Menubar, {
		children: values.map(value => jsx(MenubarMenu, {
			children: [
				jsx(MenubarTrigger, { children: value, id: `${value}-trigger`, key: 'trigger' }),
				jsx(MenuContent, { children: jsx(MenuItem, { children: `${value} action` }), key: 'content' }),
			],
			key: value,
			value,
		})),
	})), document.body)
	const file = must<HTMLButtonElement>('#file-trigger')
	const edit = must<HTMLButtonElement>('#edit-trigger')

	file.focus()
	key(file, 'ArrowLeft')
	expect(document.activeElement).toBe(edit)

	file.click()
	await vi.waitFor(() => expect(file.getAttribute('aria-expanded')).toBe('true'))
	key(must(`#${file.getAttribute('aria-controls')} [data-item="menu"]`), 'ArrowLeft')

	await vi.waitFor(() => expect(edit.getAttribute('aria-expanded')).toBe('true'))
	expect(file.getAttribute('aria-expanded')).toBe('false')
})

test('RTL NavigationMenu triggers rove with the reading direction', () => {
	render(rtl(jsx(NavigationMenu, {
		children: jsx(NavigationMenuList, {
			children: values.map(value => jsx(NavigationMenuItem, {
				children: [
					jsx(NavigationMenuTrigger, { children: value, id: `${value}-trigger`, key: 'trigger' }),
					jsx(NavigationMenuContent, { children: `${value} panel`, key: 'content' }),
				],
				key: value,
				value,
			})),
		}),
	})), document.body)
	const file = must<HTMLButtonElement>('#file-trigger')
	const edit = must<HTMLButtonElement>('#edit-trigger')

	file.focus()
	key(file, 'ArrowLeft')
	expect(document.activeElement).toBe(edit)

	key(edit, 'ArrowRight')
	expect(document.activeElement).toBe(file)
})

test('an RTL submenu opens with ArrowLeft and closes with ArrowRight', async () => {
	render(rtl(jsx(Menu, {
		children: [
			jsx(MenuTrigger, { children: 'Root', key: 'trigger' }),
			jsx(MenuContent, {
				children: jsx(MenuSub, {
					children: [
						jsx(MenuSubTrigger, { children: 'Tools', key: 'trigger' }),
						jsx(MenuSubContent, { children: jsx(MenuItem, { children: 'Child' }), key: 'content' }),
					],
				}),
				key: 'content',
			}),
		],
		defaultOpen: true,
	})), document.body)
	const trigger = must<HTMLElement>('[data-menu-sub-trigger="true"]')
	await vi.waitFor(() => expect(must('[data-menu-content="true"]').dataset.state).toBe('open'))

	trigger.focus()
	key(trigger, 'ArrowRight')
	expect(trigger.getAttribute('aria-expanded')).toBe('false')

	key(trigger, 'ArrowLeft')
	await vi.waitFor(() => expect(trigger.getAttribute('aria-expanded')).toBe('true'))
	// It opens toward the inline end, the side ArrowLeft points to.
	const sub = must('[data-menu-sub-content="true"]')
	await vi.waitFor(() => expect(floating.computePosition).toHaveBeenCalledWith(trigger, sub, expect.objectContaining({ placement: 'left-start' })))

	key(must('[data-menu-sub-content="true"] [data-item="menu"]'), 'ArrowRight')
	await vi.waitFor(() => expect(trigger.getAttribute('aria-expanded')).toBe('false'))
})
