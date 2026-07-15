import type { VNode } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { render as ssr } from 'ajo/html'
import { describe, expect, it } from 'vitest'
import { InputDateContent } from 'ajo-ui-playa/input-date'
import { PopoverContent } from 'ajo-ui-playa/popover'
import { SelectContent } from 'ajo-ui-playa/select'
import { TooltipContent, TooltipProvider } from 'ajo-ui-playa/tooltip'

const tokens = (value: string) => value.split(/\s+/)
const animationTokens = [
	'data-[state=open]:animate-in',
	'data-[state=open]:fade-in-0',
	'data-[state=open]:zoom-in-95',
	'data-[state=closed]:animate-out',
	'data-[state=closed]:fade-out-0',
	'data-[state=closed]:zoom-out-95',
]
const slideTokens = [
	'data-[side=bottom]:slide-in-from-top-2',
	'data-[side=left]:slide-in-from-right-2',
	'data-[side=right]:slide-in-from-left-2',
	'data-[side=top]:slide-in-from-bottom-2',
]

describe('popup theme tokens', () => {
	it('exposes the shared animation contract through each public popup family', () => {
		const classes = (node: unknown) => tokens((node as VNode & { class?: string }).class ?? '')
		const sliding = [
			classes(PopoverContent({})),
			classes(TooltipContent({ children: 'Tip' })),
			classes(InputDateContent({})),
		]
		const select = classes(SelectContent({}))

		for (const family of sliding) {
			for (const token of animationTokens) expect(family).toContain(token)
			for (const token of slideTokens) expect(family).toContain(token)
		}
		expect(select).toContain('playa-select-content')
		for (const token of slideTokens) expect(select).not.toContain(token)
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
