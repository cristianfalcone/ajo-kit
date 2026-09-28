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

import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from '../src/navigation-menu'
import { nativePopoverHarness } from './native-popover-harness'

const popovers = nativePopoverHarness()

const must = <Element extends HTMLElement>(selector: string) => {
	const element = document.querySelector<Element>(selector)
	if (!element) throw new Error(`Missing ${selector}`)
	return element
}

const escape = (target: HTMLElement) => {
	const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' })
	target.dispatchEvent(event)
	return event
}

beforeEach(() => {
	document.body.replaceChildren()
	floating.computePosition.mockReset()
	floating.computePosition.mockResolvedValue({ x: 10, y: 20, placement: 'bottom-start', strategy: 'fixed', middlewareData: {} })
	floating.autoUpdate.mockReset()
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

test('Escape on a top-level link closes the open panel and returns focus to its trigger', async () => {
	render(jsx(NavigationMenu, {
		children: jsx(NavigationMenuList, {
			children: [
				jsx(NavigationMenuItem, {
					children: [
						jsx(NavigationMenuTrigger, { children: 'Status', id: 'status-trigger', key: 'trigger' }),
						jsx(NavigationMenuContent, { children: jsx(NavigationMenuLink, { children: 'Done', href: '/done' }), id: 'status-panel', key: 'content' }),
					],
					key: 'status',
					value: 'status',
				}),
				jsx(NavigationMenuItem, {
					children: jsx(NavigationMenuLink, { children: 'Docs', href: '/docs', id: 'docs-link' }),
					key: 'docs',
					value: 'docs',
				}),
			],
		}),
	}), document.body)
	const trigger = must<HTMLButtonElement>('#status-trigger')
	const docs = must<HTMLAnchorElement>('#docs-link')

	expect(escape(docs).defaultPrevented).toBe(false)

	trigger.click()
	await vi.waitFor(() => expect(must('[data-slot="navigation-menu-content"]').dataset.state).toBe('open'))

	docs.focus()
	expect(escape(docs).defaultPrevented).toBe(true)
	await vi.waitFor(() => expect(trigger.getAttribute('aria-expanded')).toBe('false'))
	await vi.waitFor(() => expect(document.activeElement).toBe(trigger))
})

test('a keyboard-focused list control scrolls into view, a pressed one and a panel link do not', async () => {
	const scrolled: string[] = []
	const scroll = vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(function (this: HTMLElement, options) {
		scrolled.push(`${this.id} ${JSON.stringify(options)}`)
	})
	const nearest = JSON.stringify({ block: 'nearest', inline: 'nearest' })
	render(jsx(NavigationMenu, {
		children: jsx(NavigationMenuList, {
			children: [
				jsx(NavigationMenuItem, {
					children: [
						jsx(NavigationMenuTrigger, { children: 'Status', id: 'status-trigger', key: 'trigger' }),
						jsx(NavigationMenuContent, { children: jsx(NavigationMenuLink, { children: 'Done', href: '/done', id: 'done-link' }), key: 'content' }),
					],
					key: 'status',
					value: 'status',
				}),
				jsx(NavigationMenuItem, {
					children: jsx(NavigationMenuLink, { children: 'Docs', href: '/docs', id: 'docs-link' }),
					key: 'docs',
					value: 'docs',
				}),
			],
		}),
	}), document.body)
	const trigger = must<HTMLButtonElement>('#status-trigger')
	const docs = must<HTMLAnchorElement>('#docs-link')

	trigger.focus()
	docs.focus()
	expect(scrolled).toEqual([`status-trigger ${nearest}`, `docs-link ${nearest}`])

	trigger.click()
	await vi.waitFor(() => expect(must('[data-slot="navigation-menu-content"]').dataset.state).toBe('open'))
	must<HTMLAnchorElement>('#done-link').focus()
	expect(scrolled).toHaveLength(2)

	// A press focuses without scrolling, so the click lands on the trigger;
	// keyboard focus afterwards scrolls again.
	docs.focus()
	scrolled.length = 0
	trigger.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
	trigger.focus()
	trigger.click()
	expect(scrolled).toEqual([])
	docs.focus()
	trigger.focus()
	expect(scrolled).toEqual([`docs-link ${nearest}`, `status-trigger ${nearest}`])
	scroll.mockRestore()
})
