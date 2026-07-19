import { describe, expect, test } from 'vitest'
import { body } from '../src/form'

describe('ajo-kit form data', () => {
	test('body preserves repeated field names as arrays', () => {
		const data = new FormData()

		data.set('name', 'Deploy key')
		data.append('abilities', 'read')
		data.append('abilities', 'write')

		expect(body(data)).toEqual({
			name: 'Deploy key',
			abilities: ['read', 'write'],
		})
	})

	test('body keeps a single selected value as an array for known array fields', () => {
		const data = new FormData()

		data.set('name', 'Deploy key')
		data.append('abilities', 'read')

		expect(body(data, new Set(['abilities']))).toEqual({
			name: 'Deploy key',
			abilities: ['read'],
		})
	})
})
