import type { VNode } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { describe, expect, it } from 'vitest'
import { buttonVariants } from 'ajo-ui-playa/button'
import { Calendar } from 'ajo-ui-playa/calendar'
import { InputDateTrigger } from 'ajo-ui-playa/input-date'
import { InputGroupButton } from 'ajo-ui-playa/input-group'
import { SelectClear } from 'ajo-ui-playa/select'

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
		expect(variants.filter(variant => tokens(buttonVariants({ variant })).includes('edge'))).toEqual(['outline'])
		expect(tokens(buttonVariants({ size: 'sm' }))).toContain('h-control-sm')
		expect(tokens(buttonVariants())).toContain('h-control')
		expect(tokens(buttonVariants({ size: 'lg' }))).toContain('h-control-lg')
		expect(tokens(buttonVariants({ size: 'icon-sm' }))).toContain('size-control-sm')
		expect(tokens(buttonVariants({ size: 'icon' }))).toContain('size-control')
		expect(tokens(buttonVariants({ size: 'icon-lg' }))).toContain('size-control-lg')
	})

	it('provides one muted ghost color recipe to composed addon buttons', () => {
		const recipe = tokens(buttonVariants({ variant: 'muted-ghost' }))
		const inputDate = InputDateTrigger({}) as VNode & { class?: string }
		const select = SelectClear({}) as VNode & { class?: string }
		const expected = ['text-muted-foreground', 'hover:bg-accent', 'hover:text-foreground']

		expect(expected.every(token => recipe.includes(token))).toBe(true)
		expect(recipe).not.toContain('text-foreground')
		expect(recipe).not.toContain('hover:text-accent-foreground')
		expect(expected.every(token => tokens(inputDate.class).includes(token))).toBe(true)
		expect(expected.every(token => tokens(select.class).includes(token))).toBe(true)
		expect(tokens(inputDate.class)).not.toContain('hover:text-accent-foreground')
		expect(tokens(select.class)).not.toContain('hover:text-accent-foreground')
	})

	it('lets a composed surface own a narrower transition', () => {
		const regular = tokens(buttonVariants())
		const composed = tokens(buttonVariants({ transition: false }))

		expect(regular).toContain('transition-all')
		expect(composed).not.toContain('transition-all')
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
