// @vitest-environment happy-dom
import { render } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { Sidebar, SidebarProvider, SidebarTrigger } from '../src/sidebar'

beforeEach(() => document.body.replaceChildren())

afterEach(() => {
	render(null, document.body)
	document.body.replaceChildren()
})

test('the desktop state notifies onOpenChange and writes no cookie', () => {
	const onOpenChange = vi.fn()
	render(jsx(SidebarProvider, {
		children: [
			jsx(Sidebar, { children: 'Nav', key: 'sidebar' }),
			jsx(SidebarTrigger, { key: 'trigger' }),
		],
		mobileQuery: '(max-width: 0px)',
		onOpenChange,
	}), document.body)

	const trigger = document.querySelector<HTMLButtonElement>('[data-slot="sidebar-trigger"]')!
	expect(trigger.getAttribute('aria-expanded')).toBe('true')
	trigger.click()

	expect(onOpenChange).toHaveBeenCalledWith(false, expect.any(Event))
	expect(trigger.getAttribute('aria-expanded')).toBe('false')
	expect(document.querySelector('[data-slot="sidebar"]')?.getAttribute('data-state')).toBe('collapsed')
	expect(document.cookie).not.toContain('sidebar_state')
})

test('the mobile drawer keeps the sidebar slot and the caller ref', () => {
	const ref = vi.fn()
	render(jsx(SidebarProvider, {
		children: jsx(Sidebar, { children: 'Nav', ref }),
		mobileQuery: '(min-width: 0px)',
	}), document.body)

	const drawer = document.querySelector('dialog')

	expect(drawer?.getAttribute('data-slot')).toBe('sidebar')
	expect(drawer?.querySelector('[data-slot="sidebar-inner"]')?.textContent).toBe('Nav')
	expect(drawer?.querySelector('[data-slot="dialog-close"]')).toBeNull()
	expect(ref).toHaveBeenCalledWith(drawer)
})

test('the trigger reports the mobile drawer it opens', () => {
	render(jsx(SidebarProvider, {
		children: [
			jsx(Sidebar, { children: 'Nav', key: 'sidebar' }),
			jsx(SidebarTrigger, { key: 'trigger' }),
		],
		mobileQuery: '(min-width: 0px)',
	}), document.body)

	const trigger = document.querySelector<HTMLButtonElement>('[data-slot="sidebar-trigger"]')!
	expect(trigger.getAttribute('aria-expanded')).toBe('false')
	trigger.click()
	expect(trigger.getAttribute('aria-expanded')).toBe('true')
})
