import { describe, expect, it } from 'vitest'
import { inputGroupVariants } from '../../src/ui/input-group'

const widths = (classes: string) =>
	classes.split(/\s+/).filter(token => token.startsWith('w-'))

describe('input-group theme seam', () => {
	it('owns full width but leaves auto width to the caller', () => {
		expect(widths(inputGroupVariants({ width: 'full' }))).toEqual(['w-full'])
		expect(widths(inputGroupVariants({ width: 'auto' }))).toEqual([])
		expect(widths(inputGroupVariants({ class: 'w-[22rem]', width: 'auto' }))).toEqual(['w-[22rem]'])
		expect(inputGroupVariants({ class: 'max-w-sm', width: 'full' })).toContain('max-w-sm')
	})
})
