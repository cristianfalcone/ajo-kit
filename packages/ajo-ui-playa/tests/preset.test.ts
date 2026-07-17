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
		expect(css).toContain(':root{--radius:0.75rem')
		expect(css).toContain('.dark{--background:#101317')
		expect(css).toContain('[data-slot=button-group]')
		expect(css).toContain('[data-slot=chart] [data-slot=chart-tooltip][data-positioned=true]{transition:transform 200ms ease-out}')
		expect(css).toContain('rect[data-chart-sign=positive]{clip-path:inset(0 round 4px 4px 0 0) fill-box}')
		expect(css).toContain('rect[data-chart-sign=negative]{clip-path:inset(0 round 0 0 4px 4px) fill-box}')
		expect(css).toContain('rect[data-chart-sign=negative]{transform-origin:top center}')
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
		expect(css).toContain('.playa-popover-content>[data-slot=popup-surface]{background-color:color-mix(in srgb,var(--popover) 55%,transparent)')
		expect(css).toContain('.playa-tooltip-content>[data-slot=popup-surface]{background-color:var(--primary)')
	})
})
