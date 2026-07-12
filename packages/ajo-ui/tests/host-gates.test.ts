// @vitest-environment happy-dom
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { expect, test } from 'vitest'
import { SidebarProvider } from '../src/sidebar'
import { Tabs, TabsList, TabsTrigger } from '../src/tabs'

test('ajo/html protocol hosts stay inert inside a Window DOM realm', async () => {
	const sidebar = ssr(jsx(SidebarProvider, {
		children: jsx('span', { children: 'Navigation' }),
	}))
	const tabs = ssr(jsx(Tabs, {
		children: jsx(TabsList, {
			children: [
				jsx(TabsTrigger, { children: 'First', value: 'first' }),
				jsx(TabsTrigger, { children: 'Second', value: 'second' }),
			],
		}),
	}))

	expect(sidebar).toContain('data-slot="sidebar-wrapper"')
	expect(tabs).toContain('data-slot="tabs"')
	await new Promise<void>(resolve => queueMicrotask(resolve))
})
