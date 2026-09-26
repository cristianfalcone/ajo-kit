import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { expect, test } from 'vitest'
import { part } from 'ajo-ui/utils'

test('part keeps a caller slot override, a fixed role and merges class', () => {
	const Separator = part('div', 'separator', { class: 'base', role: 'separator' })
	const Row = part(Separator, 'row')

	expect(ssr(jsx(Separator, {}))).toBe('<div data-slot="separator" class="base" role="separator"></div>')
	expect(ssr(jsx(Row, { class: 'wide', 'data-slot': 'custom', role: 'none' })))
		.toBe('<div data-slot="custom" role="separator" class="base wide"></div>')
})
