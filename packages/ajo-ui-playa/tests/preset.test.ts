import { readdirSync, readFileSync } from 'node:fs'
import { createGenerator, type Preset } from 'unocss'
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

	it('sizes controls and text from the tokens on one scale', async () => {
		const uno = await createGenerator({ presets: [playa()] })
		const { css } = await uno.generate('h-control min-h-control size-control h-control-sm h-control-lg text-xs text-sm text-base text-xl text-2xl text-title')

		expect(css).toContain('--spacing-control: var(--control);')
		expect(css).toContain('--spacing-control-sm: var(--control-sm);')
		expect(css).toContain('--spacing-control-lg: var(--control-lg);')
		expect(css).toContain('.h-control{height:var(--spacing-control);}')
		expect(css).toContain('.min-h-control{min-height:var(--spacing-control);}')
		expect(css).toContain('.size-control{width:var(--spacing-control);height:var(--spacing-control);}')
		const sizes = Object.fromEntries([...css.matchAll(/--text-([\w]+)-fontSize: ([\d.]+)rem; --text-\1-lineHeight: ([\d.]+)rem;/g)]
			.map(([, name, size, line]) => [name, [Number(size) * 16, Number(line) * 16]]))
		expect(sizes).toEqual({ xs: [12, 16], sm: [14, 20], base: [16, 24], xl: [20, 28], '2xl': [24, 32], title: [28, 36] })
	})

	it('draws each designed state once: one flush focus ring, a danger boundary, a dimmed disabled', async () => {
		const uno = await createGenerator({ presets: [playa()] })
		const { css } = await uno.generate('playa-focus playa-invalid playa-disabled playa-field', { preflights: false })
		const ring = 'outline:var(--focus-width) solid var(--ring);outline-offset:var(--focus-offset);'

		expect(css).toContain('.playa-focus{outline:1px solid transparent;outline-offset:var(--focus-offset);}')
		expect(css).toContain(`.playa-focus:focus-visible{${ring}}`)
		// An invalid control keeps its hue while focused, in the same one ring.
		expect(css).toContain('.playa-focus[aria-invalid="true"]:focus-visible{outline-color:var(--danger);}')
		expect(css).toMatch(/\.playa-invalid\[aria-invalid="true"\]\{--un-inset-ring-shadow:inset 0 0 0 1px [^}]*var\(--danger\)/)
		expect(css).toContain('.playa-disabled:disabled{opacity:var(--disabled-opacity);pointer-events:none;}')
		expect(css).toContain('.playa-disabled[aria-disabled="true"]{opacity:var(--disabled-opacity);pointer-events:none;}')
		// The field boundary rings on focus with the same outline and adds no halo.
		expect(css).toContain(`.playa-field:focus-visible{${ring}}`)
		expect(css).toContain('.playa-field[aria-invalid="true"]:focus-visible{outline-color:var(--danger);}')
		expect(css).not.toMatch(/--un-ring-shadow:|--un-ring-color:/)
	})

	it('puts the focus ring flush outside a fill and on a 1 px boundary', async () => {
		const uno = await createGenerator({ presets: [playa()] })
		const { css } = await uno.generate('edge edge-input playa-field panel')
		const rule = (selector: string) => new RegExp(`(?:^|\\n)${selector.replace(/[.[\]]/g, '\\$&')}\\{([^}]*)\\}`).exec(css)?.[1] ?? ''
		const straddle = '--focus-offset:calc(var(--focus-width) / -2);'

		// A filled control: offset 0, and it does not inherit, so a button
		// inside a bounded card or group keeps its ring outside its fill.
		expect(css).toContain('@property --focus-offset{syntax:"<length>";inherits:false;initial-value:0px}')
		// A boundary moves the 2 px ring onto it: 1 px over it, 1 px outside.
		for (const selector of ['.edge', '.edge-input', '.playa-field', '.panel']) expect(rule(selector)).toContain(straddle)
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

	it('emits family part rules and keyframes only with their class, the rules before every utility', async () => {
		const parts = [
			'[data-slot=chart]',
			'[data-slot=toast]',
			'[data-slot=drawer-content]',
			'[data-slot=popup-surface]',
			'.playa-button-group',
			'@keyframes progress-slide',
		]
		const bare = (await (await createGenerator({ presets: [playa()] })).generate('h-9')).css
		for (const part of [...parts, '@keyframes shimmer']) expect(bare).not.toContain(part)

		const { css } = await (await createGenerator({ presets: [playa()] }))
			.generate('playa-chart playa-toaster playa-drawer playa-popup-content playa-button-group playa-progress shimmer h-9')
		const first = (text: string) => css.indexOf(text)
		expect(css).toContain('@keyframes chart-grow{from{transform:scaleY(0)}}')
		expect(css).toContain('[data-slot=toast]{position:absolute;left:1rem;right:1rem;')
		expect(css).toContain('[data-slot=drawer-content][data-side=bottom]:not([open]){transform:translateY(100%)}')
		expect(css).toContain('.playa-button-group.playa-button-group>:active{scale:none}')
		expect(css).toContain('.playa-progress[data-state=indeterminate]>[data-slot=progress-indicator]{animation:progress-slide 1.4s ease-in-out infinite}@keyframes progress-slide{')
		expect(css).toContain('@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}')
		expect(first('[data-slot=chart]')).toBeLessThan(first('.playa-chart'))
		expect(first('[data-slot=toast]{')).toBeLessThan(first('.playa-toaster'))
		expect(first('[data-slot=popup-surface]')).toBeLessThan(first('.playa-popup-content{'))
		for (const part of parts) expect(first(part)).toBeLessThan(first('.h-9'))
	})

	it('never emits one of its own rules or shortcuts from family prose', async () => {
		const preset = playa() as Preset
		const own = [preset, ...(preset.presets ?? []) as Preset[]].filter(part => part.name.startsWith('ajo-ui-playa'))
		const names = new Set(own.flatMap(part => [
			...Object.keys(part.shortcuts ?? {}),
			...(part.rules ?? []).flatMap(([matcher]) => typeof matcher === 'string' ? [matcher] : []),
		]))
		const comment = /\/\*[\s\S]*?\*\/|(?<![:'"\w])\/\/[^\n]*/g
		const src = new URL('../src/', import.meta.url)
		const files = readdirSync(src, { recursive: true, encoding: 'utf8' }).filter(file => file.endsWith('.tsx'))
		const uno = await createGenerator({ presets: [playa()] })
		const leaks: string[] = []
		for (const file of files) {
			const source = readFileSync(new URL(file, src), 'utf8')
			const prose = (await uno.generate(source.match(comment)?.join('\n') ?? '', { preflights: false })).matched
			const code = (await uno.generate(source.replace(comment, ' '), { preflights: false })).matched
			leaks.push(...[...prose].filter(name => names.has(name) && !code.has(name)).map(name => `${file}: ${name}`))
		}

		expect(names.has('panel')).toBe(true)
		expect(leaks).toEqual([])
	})

	it('does not eagerly emit application-only shortcuts or icons', async () => {
		const uno = await createGenerator({ presets: [playa()] })
		const { css } = await uno.generate('site-container h-9')

		expect(css).not.toContain('.site-container')
		expect(css).not.toContain('.i-lucide-layout-dashboard')
	})

	it('paints popup bodies and arrows as one progressively enhanced surface', async () => {
		const uno = await createGenerator({ presets: [playa()] })
		const { css } = await uno.generate('playa-popup-content')
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
		// Without backdrop-filter the solid popover fill must follow, and so outrank, the frost.
		const fallback = css.indexOf('{.playa-popover-content>[data-slot=popup-surface]{background-color:var(--popover)}}')
		expect(fallback).toBeGreaterThan(css.indexOf('.playa-popover-content>[data-slot=popup-surface]{background-color:var(--glass-overlay)'))
	})
})
