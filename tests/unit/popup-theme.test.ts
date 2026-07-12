import type { VNode } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { render as ssr } from 'ajo/html'
import { describe, expect, it } from 'vitest'
import { InputDateContent } from '../../src/ui/input-date'
import { popupAnimation, popupSlide } from '../../src/ui/menu'
import { PopoverContent } from '../../src/ui/popover'
import { SelectContent } from '../../src/ui/select'
import { TooltipContent, TooltipProvider } from '../../src/ui/tooltip'

const tokens = (value: string) => value.split(/\s+/)

describe('popup theme tokens', () => {
	it('owns the shared open and closed animation vocabulary', () => {
		expect(tokens(popupAnimation)).toEqual([
			'data-[state=open]:animate-in',
			'data-[state=open]:fade-in-0',
			'data-[state=open]:zoom-in-95',
			'data-[state=closed]:animate-out',
			'data-[state=closed]:fade-out-0',
			'data-[state=closed]:zoom-out-95',
		])
	})

	it('keeps placement motion separate for popup families that opt into it', () => {
		expect(tokens(popupSlide)).toEqual([
			'data-[side=bottom]:slide-in-from-top-2',
			'data-[side=left]:slide-in-from-right-2',
			'data-[side=right]:slide-in-from-left-2',
			'data-[side=top]:slide-in-from-bottom-2',
		])
	})

	it('keeps each popup family subscribed to its intended shared tokens', () => {
		const classes = (node: unknown) => tokens((node as VNode & { class?: string }).class ?? '')
		const sliding = [
			classes(PopoverContent({})),
			classes(TooltipContent({ children: 'Tip' })),
			classes(InputDateContent({})),
		]
		const select = classes(SelectContent({}))

		for (const family of sliding) {
			for (const token of tokens(popupAnimation)) expect(family).toContain(token)
			for (const token of tokens(popupSlide)) expect(family).toContain(token)
		}
		for (const token of tokens(popupAnimation)) expect(select).toContain(token)
		for (const token of tokens(popupSlide)) expect(select).not.toContain(token)
	})

	it('normalizes TooltipProvider style composition through the shared style helper', () => {
		const html = ssr(jsx(TooltipProvider, {
			children: 'Tooltip defaults',
			style: 'color:red;;',
		}))

		expect(html).toContain('style="display:contents;color:red"')
		expect(html).not.toContain(';;')
	})
})
