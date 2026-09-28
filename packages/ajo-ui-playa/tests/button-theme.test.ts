import type { VNode } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { describe, expect, it } from 'vitest'
import { Button, buttonVariants } from 'ajo-ui-playa/button'
import { ButtonGroup } from 'ajo-ui-playa/button-group'
import { Calendar } from 'ajo-ui-playa/calendar'
import { InputDateTrigger } from 'ajo-ui-playa/input-date'
import { InputGroupButton } from 'ajo-ui-playa/input-group'
import { SelectClear } from 'ajo-ui-playa/select'
import { Toggle } from 'ajo-ui-playa/toggle'
import { Toolbar } from 'ajo-ui-playa/toolbar'

const tokens = (value: string | undefined) => value?.split(/\s+/) ?? []

describe('button theme composition', () => {
	it('provides one conflict-free destructive ghost treatment', () => {
		const classes = tokens(buttonVariants({ size: 'icon-sm', variant: 'danger-ghost' }))

		expect(classes).toContain('text-danger')
		expect(classes).toContain('hover:bg-danger/10')
		expect(classes).toContain('hover:text-danger')
		expect(classes).not.toContain('text-foreground')
		expect(classes).not.toContain('shadow-xs')
	})

	it('gives every variant the one focus ring and the control heights', () => {
		const variants = ['default', 'danger', 'danger-ghost', 'ghost', 'link', 'muted-ghost', 'outline', 'secondary'] as const

		for (const variant of variants) {
			const classes = tokens(buttonVariants({ variant }))
			expect(classes).toContain('playa-focus')
			expect(classes).toContain('playa-invalid')
			expect(classes).toContain('playa-disabled')
			expect(classes.filter(token => /(?:^|:)(?:ring|outline)-|ring-\d/.test(token))).toEqual([])
		}
		// Only a variant with a 1 px boundary moves the ring onto its edge;
		// the filled ones keep all of it outside the fill.
		expect(variants.filter(variant => tokens(buttonVariants({ variant })).some(token => token === 'edge' || token === 'edge-input'))).toEqual(['outline', 'secondary'])
		expect(tokens(buttonVariants({ size: 'sm' }))).toContain('h-control-sm')
		expect(tokens(buttonVariants())).toContain('h-control')
		expect(tokens(buttonVariants({ size: 'lg' }))).toContain('h-control-lg')
		expect(tokens(buttonVariants({ size: 'icon-sm' }))).toContain('size-control-sm')
		expect(tokens(buttonVariants({ size: 'icon' }))).toContain('size-control')
		expect(tokens(buttonVariants({ size: 'icon-lg' }))).toContain('size-control-lg')
	})

	it('gives the primary action the plate and every other fill a flat role', () => {
		const primary = tokens(buttonVariants())
		const danger = tokens(buttonVariants({ variant: 'danger' }))

		expect(primary).toContain('gilt-plate')
		expect(primary.filter(token => /^(?:hover:)?bg-/.test(token))).toEqual([])
		// A filled danger action is its own role: white on a deeper red, not the danger text hue.
		expect(danger).toContain('bg-danger-fill')
		expect(danger).toContain('text-danger-fill-foreground')
		expect(danger).not.toContain('bg-danger')
		expect(tokens(buttonVariants({ variant: 'link' }))).toContain('underline')
		// Outline, ghost and muted ghost take the gold tint at three strengths.
		const tints = (['outline', 'ghost', 'muted-ghost'] as const).map(variant => tokens(buttonVariants({ variant })).find(token => token.startsWith('hover:bg-accent')))
		expect(new Set(tints).size).toBe(3)
	})

	it('keeps a busy button still, labelled and inert', () => {
		const html = ssr(jsx(Button, { loading: true, children: [jsx('span', { class: 'i-lucide-plus' }), 'Create app'] }))
		const idle = ssr(jsx(Button, { children: 'Create app' }))

		expect(html).toMatch(/^<button\b(?=[^>]*aria-busy="true")(?=[^>]*aria-disabled="true")[^>]*><span\b[^>]*data-slot="spinner"/)
		expect(html).toContain('Create app')
		expect(idle).not.toMatch(/aria-(?:busy|disabled)="/)
		expect(idle).not.toContain('data-slot="spinner"')
		// Busy undoes the disabled dimming, so the plate keeps its metal.
		expect(tokens(buttonVariants())).toContain('aria-busy:aria-disabled:opacity-100')
	})

	it('presses a toggle to the raised surface, never the primary fill', () => {
		const html = ssr(jsx(Toggle, { defaultPressed: true, children: 'Bold' }))
		const classes = tokens(/class="([^"]*)"/.exec(html)?.[1])

		expect(classes).toContain('data-[state=on]:bg-secondary')
		expect(classes.filter(token => token.includes('primary'))).toEqual([])
		expect(classes).toContain('playa-focus')
		expect(classes).toContain('h-control')
		// An outline toggle already has the hairline, so pressed steps up to the input boundary.
		const outline = tokens(/class="([^"]*)"/.exec(ssr(jsx(Toggle, { variant: 'outline', children: 'Bold' })))?.[1])
		expect(outline).toContain('data-[state=on]:edge-input')
		expect(outline).not.toContain('data-[state=on]:edge')
	})

	it('lets a toolbar or button group set one height for its row', () => {
		const toolbar = ssr(jsx(Toolbar, { 'aria-label': 'Editor', size: 'sm', children: jsx(Button, { children: 'Undo' }) }))
		const group = ssr(jsx(ButtonGroup, { size: 'lg', children: jsx(Button, { children: 'Archive' }) }))

		expect(toolbar).toMatch(/^<div\b(?=[^>]*data-size="sm")(?=[^>]*class="[^"]*\bplaya-control-size\b)/)
		expect(group).toMatch(/^<div\b(?=[^>]*data-size="lg")(?=[^>]*class="[^"]*\bplaya-control-size\b)/)
	})

	it('provides one muted ghost color recipe to composed addon buttons', () => {
		const recipe = tokens(buttonVariants({ variant: 'muted-ghost' }))
		const inputDate = InputDateTrigger({}) as VNode & { class?: string }
		const select = SelectClear({}) as VNode & { class?: string }
		const expected = ['text-muted-foreground', 'hover:bg-accent/50', 'hover:text-foreground']

		expect(expected.every(token => recipe.includes(token))).toBe(true)
		expect(recipe).not.toContain('text-foreground')
		expect(recipe).not.toContain('hover:text-accent-foreground')
		expect(expected.every(token => tokens(inputDate.class).includes(token))).toBe(true)
		expect(expected.every(token => tokens(select.class).includes(token))).toBe(true)
		expect(tokens(inputDate.class)).not.toContain('hover:text-accent-foreground')
		expect(tokens(select.class)).not.toContain('hover:text-accent-foreground')
	})

	it('lets a composed surface own a narrower transition', () => {
		const regular = tokens(buttonVariants({ variant: 'secondary' }))
		const plate = tokens(buttonVariants())
		const composed = tokens(buttonVariants({ transition: false }))

		expect(regular).toContain('transition-all')
		expect(plate).toContain('transition-all')
		// Hover slides the plate's sheen, a layer of its own.
		expect(plate).toContain('playa-sheen')
		expect(composed.filter(token => token.startsWith('transition') || token.startsWith('[transition:'))).toEqual([])
	})

	it('uses those opt-outs at the input-group and calendar seams', () => {
		const inputGroup = InputGroupButton({ variant: 'default' }) as VNode & { class?: string }
		const calendar = ssr(jsx(Calendar, { defaultMonth: new Date(2026, 6, 1, 12) }))
		const calendarDay = /<button[^>]*class="([^"]*)"[^>]*data-slot="calendar-day-button"/.exec(calendar)?.[1]
		const inputGroupClasses = tokens(inputGroup.class)
		const calendarClasses = tokens(calendarDay)

		expect(inputGroupClasses).not.toContain('shadow-xs')
		expect(inputGroupClasses).not.toContain('shadow-none')
		expect(calendarClasses).toContain('transition-[color,box-shadow,background-color]')
		expect(calendarClasses).not.toContain('transition-all')
		// A day is a Button: it keeps the one ring and adds no halo of its own.
		expect(calendarClasses).toContain('playa-focus')
		expect(calendarClasses.filter(token => token.startsWith('focus-visible:') || token === 'outline-none')).toEqual([])
	})
})
