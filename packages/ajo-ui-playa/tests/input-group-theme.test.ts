import type { VNode } from 'ajo'
import { describe, expect, it } from 'vitest'
import { InputGroup } from 'ajo-ui-playa/input-group'
import { SelectInput } from 'ajo-ui-playa/select'

const widths = (classes: string) =>
	classes.split(/\s+/).filter(token => token.startsWith('w-'))
const classes = (node: unknown) => (node as VNode & { class?: string }).class ?? ''

describe('input-group theme seam', () => {
	it('exposes full and caller-owned widths through the public adapters', () => {
		expect(widths(classes(InputGroup({})))).toEqual(['w-full'])
		expect(widths(classes(SelectInput({})))).toEqual([])
		expect(widths(classes(SelectInput({ class: 'w-[22rem]' })))).toEqual(['w-[22rem]'])
		expect(classes(InputGroup({ class: 'max-w-sm' }))).toContain('max-w-sm')
	})
})
