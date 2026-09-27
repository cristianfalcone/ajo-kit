import type { VNode } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { describe, expect, it } from 'vitest'
import { Dialog, DialogClose, DialogContent } from 'ajo-ui-playa/dialog'
import { Drawer, DrawerContent } from 'ajo-ui-playa/drawer'

const tokens = (handle: boolean) => String((DrawerContent({ handle }) as VNode & { class?: string }).class).split(/\s+/)

describe('drawer theme', () => {
	it('keys edge geometry off data-side and keeps horizontal geometry when a handle is shown', () => {
		const plain = tokens(false)
		const handled = tokens(true)
		const horizontal = (list: string[]) => list.filter(token => /^data-\[side=(left|right)\]:/.test(token))

		expect(horizontal(plain)).toContain('data-[side=right]:border-l')
		expect(horizontal(handled)).toEqual(horizontal(plain))
		expect(handled).toContain('data-[side=bottom]:rounded-t-lg')
		expect(plain).not.toContain('data-[side=bottom]:rounded-t-lg')
		expect(handled).toContain('*:data-[slot=drawer-handle]:bg-muted')
	})
})

describe('dialog close part', () => {
	it('renders no close control in DialogContent or DrawerContent unless one is composed', () => {
		const dialog = ssr(jsx(Dialog, { children: jsx(DialogContent, { children: 'Body' }) }))
		const drawer = ssr(jsx(Drawer, { children: jsx(DrawerContent, { children: 'Body' }) }))

		expect(dialog).not.toContain('data-slot="dialog-close"')
		expect(drawer).not.toContain('data-slot="dialog-close"')
	})

	it('renders the labelled corner X for a bare DialogClose and caller children otherwise', () => {
		const bare = ssr(jsx(Dialog, { children: jsx(DialogContent, { children: jsx(DialogClose, {}) }) }))
		const custom = ssr(jsx(Dialog, { children: jsx(DialogContent, { children: jsx(DialogClose, { children: 'Done' }) }) }))
		const bareClose = bare.match(/<button[^>]*data-slot="dialog-close"[^>]*>.*?<\/button>/)?.[0]
		const customClose = custom.match(/<button[^>]*data-slot="dialog-close"[^>]*>.*?<\/button>/)?.[0]

		expect(bareClose).toMatch(/^<button\b(?=[^>]*aria-label="Close")(?=[^>]*class="[^"]*\babsolute\b)/)
		expect(bareClose).toMatch(/<span\b(?=[^>]*aria-hidden="true")(?=[^>]*class="[^"]*\bi-lucide-x\b)[^>]*>/)
		expect(customClose).toMatch(/>Done<\/button>$/)
		expect(customClose).not.toContain('aria-label=')
		expect(customClose).not.toContain('i-lucide-x')
	})
})
