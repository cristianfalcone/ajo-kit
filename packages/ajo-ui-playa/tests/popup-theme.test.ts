import { readFile } from 'node:fs/promises'
import type { VNode } from 'ajo'
import { jsx } from 'ajo/jsx-runtime'
import { render as ssr } from 'ajo/html'
import { createGenerator } from 'unocss'
import { describe, expect, it } from 'vitest'
import { playa } from 'ajo-ui-playa'
import { MenuCheckboxItem, MenuRadioItem } from 'ajo-ui-playa/menu'
import { MenubarTrigger } from 'ajo-ui-playa/menubar'
import { NavigationMenuContent, NavigationMenuTrigger } from 'ajo-ui-playa/navigation-menu'
import { PopoverContent } from 'ajo-ui-playa/popover'
import { SelectContent } from 'ajo-ui-playa/select'
import { TooltipContent, TooltipProvider } from 'ajo-ui-playa/tooltip'

const tokens = (value: string) => value.split(/\s+/)
const classes = (node: unknown) => tokens((node as VNode & { class?: string }).class ?? '')
const slideTokens = [
	'data-[side=bottom]:slide-in-from-top-2',
	'data-[side=left]:slide-in-from-right-2',
	'data-[side=right]:slide-in-from-left-2',
	'data-[side=top]:slide-in-from-bottom-2',
]

// The declarations of every rule with exactly this selector, joined.
const rule = (css: string, selector: string) => {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	return [...css.matchAll(new RegExp(`(?:^|[}\\s])${escaped}\\{([^}]*)\\}`, 'g'))].map(match => match[1]).join(';')
}

describe('popup theme tokens', () => {
	it('opens and closes popovers, tooltips and navigation panels with a fade and a scale from 0.98', () => {
		const motion = [
			'data-[state=open]:animate-in',
			'data-[state=open]:fade-in-0',
			'data-[state=open]:zoom-in-98',
			'data-[state=closed]:animate-out',
			'data-[state=closed]:fade-out-0',
			'data-[state=closed]:zoom-out-98',
			'[animation-timing-function:var(--ease)]',
			'motion-reduce:animate-none',
		]
		const floating = [
			classes(PopoverContent({})),
			classes(TooltipContent({ children: 'Tip' })),
			classes(NavigationMenuContent({})),
		]

		for (const family of floating) {
			for (const token of motion) expect(family).toContain(token)
			for (const token of slideTokens) expect(family).not.toContain(token)
		}
	})

	it('keeps a select without a slide', () => {
		const select = classes(SelectContent({}))
		expect(select).toContain('playa-select-content')
		for (const token of slideTokens) expect(select).not.toContain(token)
	})

	it('gives every floating layer one radius', async () => {
		for (const family of [PopoverContent({}), TooltipContent({ children: 'Tip' })])
			expect(classes(family).filter(token => token.includes('--popup-radius'))).toEqual([])
		const { css } = await (await createGenerator({ presets: [playa()] })).generate('playa-popup-content playa-menu-content')
		expect(rule(css, '.playa-popup-content')).toContain('--popup-radius:var(--radius);')
		expect(rule(css, '.playa-menu-content')).toContain('border-radius:var(--radius-md);')
		expect(css).toContain('--radius-md: var(--radius);')
	})

	it('keeps a transparent outline on every floating body, which forced colours paint', async () => {
		// Forced colours drop the box-shadow edge; the outline is the boundary left.
		const { css } = await (await createGenerator({ presets: [playa()] })).generate('playa-popup-content playa-menu-content')
		for (const selector of ['.playa-popup-content', '.playa-menu-content'])
			expect(rule(css, selector)).toContain('outline:1px solid transparent;')
		for (const family of [PopoverContent({}), TooltipContent({ children: 'Tip' }), NavigationMenuContent({})])
			expect(classes(family).filter(token => token.startsWith('outline-'))).toEqual([])
		expect(classes(NavigationMenuContent({}))).toContain('[outline:1px_solid_transparent]')
	})

	it('frosts floating layers thinly enough to read and floats them without a contact line', async () => {
		const sheet = await readFile(new URL('../src/tokens.css', import.meta.url), 'utf8')
		const token = (name: string) => new RegExp(`${name}:\\s*([^;]+);`).exec(sheet)?.[1] ?? ''
		// Above three quarters the frost reads as a solid panel: nothing under it tints it.
		const opacity = Number(/var\(--popover\) (\d+)%/.exec(token('--glass-overlay'))?.[1])
		expect(opacity).toBeGreaterThan(0)
		expect(opacity).toBeLessThanOrEqual(75)
		// A layer blurred by less than 4 px draws a line under the edge, which reads as a lip.
		const blurs = token('--shadow-lg').split(/,\s*(?![^(]*\))/).map(layer => Number(/^\S+ \S+ (\d+)px/.exec(layer)?.[1]))
		expect(blurs.length).toBeGreaterThan(0)
		for (const blur of blurs) expect(blur).toBeGreaterThanOrEqual(4)
	})

	it('marks the chosen radio item with the check a checkbox item shows', () => {
		expect(classes(MenuRadioItem({ value: 'top' }))).toEqual(classes(MenuCheckboxItem({})))
	})

	it('rings the Menubar and NavigationMenu triggers with the one focus ring', () => {
		for (const trigger of [MenubarTrigger({}), NavigationMenuTrigger({ children: 'Home' })]) {
			const list = classes(trigger)
			expect(list).toContain('playa-focus')
			expect(list.filter(token => token.startsWith('focus:') || token === 'outline-none')).toEqual([])
		}
	})

	it('puts tooltips on navy in the light theme and on the raised surface at night', async () => {
		const { css } = await (await createGenerator({ presets: [playa()] })).generate('playa-popup-content playa-tooltip-content')
		// The surface and its shadow follow the page's scheme; what the tooltip holds reads dark.
		expect(rule(css, '.playa-tooltip-content>[data-slot=popup-surface]')).toBe('background-color:light-dark(var(--navy),var(--popover))')
		expect(rule(css, '.playa-tooltip-content')).toContain('color:light-dark(var(--background),var(--foreground));')
		expect(rule(css, '.playa-tooltip-content')).not.toContain('color-scheme')
		expect(rule(css, '.playa-tooltip-content > *:not([data-slot=popup-surface])')).toBe('color-scheme:dark;')
		expect(rule(css, '.playa-tooltip-content')).toContain('filter:drop-shadow(0 1px 1px var(--shadow-color)) drop-shadow(0 6px 12px var(--shadow-color))')
	})

	it('draws menu rows from one recipe on the control scale, with labels and shortcuts stepping back', async () => {
		const { css } = await (await createGenerator({ presets: [playa()] }))
			.generate('playa-menu-item playa-menu-choice-row playa-menu-label playa-menu-shortcut playa-menu-separator')
		const item = rule(css, '.playa-menu-item')
		const choice = rule(css, '.playa-menu-choice-row')
		for (const row of [item, choice]) {
			expect(row).toContain('min-height:var(--spacing-control-sm);')
			expect(row).toContain('padding-block:calc(var(--spacing) * 1);')
			expect(row).toContain('font-size:var(--text-sm-fontSize);')
		}
		expect(choice).toContain('padding-inline-start:calc(var(--spacing) * 8);')

		const label = rule(css, '.playa-menu-label')
		expect(label).toContain('font-size:var(--text-xs-fontSize);')
		expect(label).toContain('var(--faint-foreground)')
		expect(label).not.toContain('text-transform')

		const shortcut = rule(css, '.playa-menu-shortcut')
		expect(shortcut).toContain('font-family:var(--font-mono);')
		expect(shortcut).not.toContain('letter-spacing')
		expect(shortcut).toContain('margin-inline-start:auto;')

		expect(rule(css, '.playa-menu-separator')).toContain('margin-inline:calc(var(--spacing) * 2);')
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
