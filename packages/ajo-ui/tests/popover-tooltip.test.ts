import { render as ssr } from 'ajo/html'
import { expect, test } from 'vitest'
import { PopoverContent } from '../src/popover'
import { TooltipContent } from '../src/tooltip'

test('Popover and Tooltip content own stable SSR surfaces and their arrow policies', () => {
	const popover = ssr(PopoverContent({ children: 'Popover' }))
	const arrowPopover = ssr(PopoverContent({ arrow: true, children: 'Popover' }))
	const tooltip = ssr(TooltipContent({ children: 'Tooltip' }))

	expect(popover).toContain('data-slot="popup-surface"')
	expect(popover).not.toContain('data-arrow="true"')
	expect(popover).not.toContain('data-slot="popup-arrow"')
	expect(arrowPopover).toContain('data-arrow="true"')
	expect(arrowPopover).toContain('data-slot="popup-surface"')
	expect(arrowPopover).toContain('data-slot="popup-arrow"')
	expect(tooltip).toContain('data-arrow="true"')
	expect(tooltip).toContain('data-slot="popup-surface"')
	expect(tooltip).toContain('data-slot="popup-arrow"')
	expect(tooltip).toContain('width:14px;height:14px')
	expect(tooltip).toContain('background:transparent')
	expect(tooltip).toContain('opacity:0')
})
