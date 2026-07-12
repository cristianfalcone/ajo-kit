import type { VNode } from 'ajo'
import { describe, expect, it } from 'vitest'
import { buttonVariants } from '../../src/ui/button'
import { CalendarDayButton } from '../../src/ui/calendar'
import { InputDateTrigger } from '../../src/ui/input-date'
import { InputGroupButton } from '../../src/ui/input-group'
import { SelectInput } from '../../src/ui/select'

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

	it('gives every variant exactly one focus-ring color owner', () => {
		const regular = tokens(buttonVariants({ variant: 'default' }))
		const danger = tokens(buttonVariants({ variant: 'danger' }))
		const dangerGhost = tokens(buttonVariants({ variant: 'danger-ghost' }))

		expect(regular.filter(token => token.startsWith('focus-visible:ring-') && token !== 'focus-visible:ring-3')).toEqual(['focus-visible:ring-ring/50'])
		expect(danger.filter(token => token.startsWith('focus-visible:ring-') && token !== 'focus-visible:ring-3')).toEqual(['focus-visible:ring-danger/40'])
		expect(dangerGhost.filter(token => token.startsWith('focus-visible:ring-') && token !== 'focus-visible:ring-3')).toEqual(['focus-visible:ring-danger/40'])
	})

	it('provides one muted ghost color recipe to composed addon buttons', () => {
		const recipe = tokens(buttonVariants({ variant: 'muted-ghost' }))
		const inputDate = InputDateTrigger({}) as VNode & { class?: string }
		const select = SelectInput({}) as VNode & { clearButtonClass?: string }
		const expected = ['text-muted-foreground', 'hover:bg-accent', 'hover:text-foreground']

		expect(expected.every(token => recipe.includes(token))).toBe(true)
		expect(recipe).not.toContain('text-foreground')
		expect(recipe).not.toContain('hover:text-accent-foreground')
		expect(expected.every(token => tokens(inputDate.class).includes(token))).toBe(true)
		expect(expected.every(token => tokens(select.clearButtonClass).includes(token))).toBe(true)
		expect(tokens(inputDate.class)).not.toContain('hover:text-accent-foreground')
		expect(tokens(select.clearButtonClass)).not.toContain('hover:text-accent-foreground')
	})

	it('lets a composed surface decline the variant shadow', () => {
		const regular = tokens(buttonVariants({ variant: 'default' }))
		const composed = tokens(buttonVariants({ shadow: false, variant: 'default' }))

		expect(regular).toContain('shadow-xs')
		expect(composed).not.toContain('shadow-xs')
	})

	it('lets a composed surface own a narrower transition', () => {
		const regular = tokens(buttonVariants())
		const composed = tokens(buttonVariants({ transition: false }))

		expect(regular).toContain('transition-all')
		expect(composed).not.toContain('transition-all')
	})

	it('uses those opt-outs at the input-group and calendar seams', () => {
		const inputGroup = InputGroupButton({ variant: 'default' }) as VNode & { class?: string }
		const calendarDay = CalendarDayButton({
			date: new Date(2026, 6, 1),
			day: 1,
			modifiers: {
				disabled: false,
				outside: false,
				range_end: false,
				range_middle: false,
				range_start: false,
				selected: false,
				today: false,
				unavailable: false,
			},
		}) as VNode & { class?: string }
		const inputGroupClasses = tokens(inputGroup.class)
		const calendarClasses = tokens(calendarDay.class)

		expect(inputGroupClasses).not.toContain('shadow-xs')
		expect(inputGroupClasses).not.toContain('shadow-none')
		expect(calendarClasses).toContain('transition-[color,box-shadow,background-color]')
		expect(calendarClasses).not.toContain('transition-all')
	})
})
