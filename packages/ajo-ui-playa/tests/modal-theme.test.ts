import type { VNode } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { createGenerator } from 'unocss'
import { describe, expect, it } from 'vitest'
import { playa } from 'ajo-ui-playa'
import { AlertDialog, AlertDialogContent, AlertDialogFooter, AlertDialogHeader } from 'ajo-ui-playa/alert-dialog'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from 'ajo-ui-playa/dialog'
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader } from 'ajo-ui-playa/drawer'

const tokens = (handle: boolean) => String((DrawerContent({ handle }) as VNode & { class?: string }).class).split(/\s+/)

describe('drawer theme', () => {
	it('keys edge geometry off data-side and keeps horizontal geometry when a handle is shown', () => {
		const plain = tokens(false)
		const handled = tokens(true)
		const horizontal = (list: string[]) => list.filter(token => /^data-\[side=(left|right)\]:/.test(token))

		expect(horizontal(plain)).toContain('data-[side=right]:border-l')
		expect(horizontal(handled)).toEqual(horizontal(plain))
		expect(handled).toContain('data-[side=bottom]:rounded-t-xl')
		expect(plain).not.toContain('data-[side=bottom]:rounded-t-xl')
		expect(handled).toContain('*:data-[slot=drawer-handle]:bg-input')
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

describe('modal layout and motion', () => {
	const classes = (html: string, slot: string) => html.match(new RegExp(`<[^>]*data-slot="${slot}"[^>]*>`))?.[0].match(/class="([^"]*)"/)?.[1].split(/\s+/) ?? []

	it('starts every header at the start edge and keeps Cancel before the primary action in every footer', () => {
		const html = ssr(jsx('div', { children: [
			jsx(Dialog, { children: jsx(DialogContent, { children: [jsx(DialogHeader, {}), jsx(DialogFooter, {})] }) }),
			jsx(AlertDialog, { children: jsx(AlertDialogContent, { children: [jsx(AlertDialogHeader, {}), jsx(AlertDialogFooter, {})] }) }),
			jsx(Drawer, { children: jsx(DrawerContent, { children: [jsx(DrawerHeader, {}), jsx(DrawerFooter, {})] }) }),
		] }))

		for (const slot of ['dialog-header', 'alert-dialog-header', 'drawer-header']) {
			const header = classes(html, slot)
			expect(header, slot).toContain('text-start')
			expect(header.filter(token => /text-(?:center|left|right)$/.test(token)), slot).toEqual([])
		}
		for (const slot of ['dialog-footer', 'alert-dialog-footer', 'drawer-footer']) {
			const footer = classes(html, slot)
			expect(footer, slot).toContain('justify-end')
			expect(footer.filter(token => /reverse|flex-col|order-/.test(token)), slot).toEqual([])
		}
	})

	it('fades a dialog in without moving it under reduced motion', async () => {
		const dialog = String((DialogContent({}) as VNode & { class?: string }).class)
		const alert = ssr(jsx(AlertDialog, { children: jsx(AlertDialogContent, {}) }))
		const uno = await createGenerator({ presets: [playa()] })
		for (const source of [dialog, classes(alert, 'alert-dialog-content').join(' ')]) {
			const { css } = await uno.generate(source, { preflights: false })
			const name = /@media \(prefers-reduced-motion:\s?reduce\)\s?\{[^{}]*\[data-state=open\][^{}]*\{[^}]*animation-name:([\w-]+)/.exec(css)?.[1]
			expect(name, 'a reduced-motion animation for the open dialog').toBeTruthy()
			const frames = new RegExp(`@keyframes ${name}\\{((?:[^{}]*\\{[^}]*\\})*)\\}`).exec(css)?.[1]
			expect(frames).toContain('opacity:0')
			expect(frames).not.toMatch(/transform|translate|scale|rotate/)
		}
	})
})

describe('toast controls', () => {
	it('rings the action with the one focus ring when it has keyboard focus', async () => {
		const uno = await createGenerator({ presets: [playa()] })
		const { css } = await uno.generate('playa-toaster', { preflights: false })

		expect(css).toMatch(/\[data-slot=toast-action\]:focus-visible\{outline:var\(--focus-width\) solid var\(--ring\)\}/)
	})
})
