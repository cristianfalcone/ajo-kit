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
	})

	it('does not eagerly emit application-only shortcuts or icons', async () => {
		const uno = await createGenerator({ presets: [playa()] })
		const { css } = await uno.generate('site-container h-9')

		expect(css).not.toContain('.site-container')
		expect(css).not.toContain('.i-lucide-layout-dashboard')
	})
})
