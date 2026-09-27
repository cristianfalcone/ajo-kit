import { createGenerator } from 'unocss'
import { describe, expect, it } from 'vitest'
import { playa } from 'ajo-ui-playa'

describe('playa preset', () => {
	it('is named for UnoCSS diagnostics', () => {
		expect(playa()).toMatchObject({ name: 'ajo-ui-playa' })
	})

	it('generates the complete themed contract through its public interface', async () => {
		const uno = await createGenerator({ presets: [playa()] })
		const { css } = await uno.generate([
			'h-9',
			'bg-primary',
			'edge',
			'playa-table-container',
			'playa-chart',
			'aria-invalid:ring-danger/25',
			'scroll-fade-x',
			'i-lucide-check',
		].join(' '))

		expect(css).toContain('.h-9')
		expect(css).toContain('background-color:color-mix(in srgb, var(--primary)')
		expect(css).toContain('.edge')
		expect(css).toContain('.playa-table-container')
		expect(css).toContain('[aria-invalid="true"]')
		expect(css).toContain('.scroll-fade-x')
		expect(css).toContain('.i-lucide-check')
		expect(css).toContain('[data-slot=button-group]')
		expect(css).toContain('::selection{background-color:color-mix(in oklab,var(--gold-4) 35%,transparent)}')
		expect(css).toContain(':where(:focus-visible){outline:var(--focus-width) solid var(--ring);outline-offset:0}')
		expect(css).toContain('[data-slot=chart] [data-slot=chart-tooltip][data-positioned=true]{transition:transform 200ms ease-out}')
		expect(css).toContain('rect[data-chart-sign=positive]{clip-path:inset(0 round 4px 4px 0 0) fill-box}')
		expect(css).toContain('rect[data-chart-sign=negative]{clip-path:inset(0 round 0 0 4px 4px) fill-box}')
		expect(css).toContain('rect[data-chart-sign=negative]{transform-origin:top center}')
		// Chart parts are painted by data-slot and state, not by class arguments.
		expect(css).toContain('.playa-chart :where([data-slot=chart-grid]>line){stroke:var(--border);}')
		expect(css).toContain('.playa-chart :where(circle[data-chart-index]){fill:var(--background);}')
		expect(css).toContain('.playa-chart :is([data-slot=chart-tooltip-item][data-indicator=dot]){align-items:center;}')
		expect(css).toMatch(/\.playa-chart :is\(\[data-indicator=dashed\]>\[data-slot=chart-tooltip-indicator\]\)\{[^}]*border-style:dashed;[^}]*border-width:1\.5px;/)
	})

	it('follows the system colour scheme and lets a root class force one', async () => {
		const uno = await createGenerator({ presets: [playa()] })
		const { css } = await uno.generate('')

		expect(css).toContain(':root{color-scheme:light dark;')
		expect(css).toContain('--background:light-dark(#f5efe6,#11100e);')
		expect(css).toContain(':root.light{color-scheme:light}')
		expect(css).toContain(':root.dark{color-scheme:dark}')
		// Wind4's dark: variant is class-only and would miss the system scheme.
		expect(css.replaceAll(':root.dark{', '')).not.toMatch(/\.dark\b/)
	})

	it('gives the theme keys Wind4 also defines to the tokens', async () => {
		const uno = await createGenerator({ presets: [playa()] })
		const { css } = await uno.generate('rounded-md shadow-lg shadow-xl font-sans font-mono font-title')

		expect(css).toContain('--radius-md: var(--radius);')
		expect(css).toContain('.shadow-lg{--un-shadow:var(--shadow-lg);')
		expect(css).toContain('.shadow-xl{--un-shadow:var(--shadow-xl);')
		expect(css).toContain('--font-sans: var(--font-body);')
		expect(css).toContain('--font-mono: var(--font-data);')
		expect(css).toContain('--font-title: var(--font-display);')
	})

	it('paints the materials through Wind4 shadow slots so rings still stack', async () => {
		const uno = await createGenerator({ presets: [playa()] })
		const { css } = await uno.generate('gilt-plate panel navy scrim glass-chrome glass-overlay ring-3')
		const slots = 'box-shadow:var(--un-inset-shadow,0 0 #0000),var(--un-inset-ring-shadow,0 0 #0000),var(--un-ring-offset-shadow,0 0 #0000),var(--un-ring-shadow,0 0 #0000),var(--un-shadow,0 0 #0000)'

		expect(css).toContain(`--un-inset-shadow:var(--gilt-plate-edge);--un-shadow:var(--gilt-plate-shadow);${slots}`)
		expect(css).toMatch(/\.panel\{[^}]*background-color:color-mix\(in srgb, var\(--card\)[^}]*--un-inset-ring-color:color-mix\(in srgb, var\(--border\)/)
		expect(css).toMatch(/\.navy\{[^}]*background-color:var\(--navy\);color:var\(--foreground\);color-scheme:dark;/)
		expect(css).toContain('.scrim::backdrop{background-color:color-mix(in oklab, var(--scrim)')
		expect(css).toContain('.glass-chrome{background-color:var(--glass-chrome);')
		expect(css).toContain('.glass-overlay{background-color:var(--glass-overlay);')
		expect(css).toContain('@property --navy{syntax:\'<color>\';inherits:true;')
	})

	it('themes base-owned inner nodes through their slots and state attributes', async () => {
		const uno = await createGenerator({ presets: [playa()] })
		const { css } = await uno.generate('playa-select-item playa-select-input playa-toaster')

		expect(css).toContain('.playa-select-item > *[data-selected=true][data-slot=select-item-indicator]{opacity:100%;}')
		expect(css).toContain('.playa-select-input:has([data-slot=select-clear]) [data-slot=select-input-trigger]{display:none;}')
		expect(css).toContain('.playa-toaster>:where([data-slot=toast][data-variant=danger]){color:')
		expect(css).toContain('.playa-toaster[data-rich-colors]>:where([data-slot=toast][data-variant=info]){color:')
		expect(css).toContain('[data-rich-colors]>[data-slot=toast][data-variant=info]{background-color:')
	})

	it('does not eagerly emit application-only shortcuts or icons', async () => {
		const uno = await createGenerator({ presets: [playa()] })
		const { css } = await uno.generate('site-container h-9')

		expect(css).not.toContain('.site-container')
		expect(css).not.toContain('.i-lucide-layout-dashboard')
	})

	it('paints popup bodies and arrows as one progressively enhanced surface', async () => {
		const uno = await createGenerator({ presets: [playa()] })
		const { css } = await uno.generate('h-9')
		const surface = '.playa-popup-content>[data-slot=popup-surface]'
		const nearRadius = 'min(var(--popup-radius),max(0px,calc(var(--popup-arrow-center) - 7px)))'
		const farRadius = 'min(var(--popup-radius),max(0px,calc(100% - var(--popup-arrow-center) - 7px)))'

		expect(css).toContain(`${surface}{position:absolute;inset:0;z-index:-1;pointer-events:none;border-radius:inherit}`)
		expect(css).toContain('@supports (clip-path:shape(from 0 0,line to 100% 0,close)){')
		for (const side of ['top', 'bottom', 'left', 'right'])
			expect(css).toContain(`[data-arrow=true][data-side=${side}]>[data-slot=popup-surface]`)
		expect(css).toContain('var(--popup-arrow-center)')
		expect(css).toContain(nearRadius)
		expect(css).toContain(farRadius)
		expect(css).toContain('.playa-popover-content>[data-slot=popup-surface]{background-color:var(--glass-overlay);-webkit-backdrop-filter:var(--glass-filter)')
		expect(css).toContain('.playa-tooltip-content>[data-slot=popup-surface]{background-color:var(--navy)')
	})
})
