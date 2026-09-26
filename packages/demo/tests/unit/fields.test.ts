import { expect, test } from 'vitest'
import { parse } from '@kit/validate'
import { email } from '../../src/data/fields'

test('email accepts at most 254 characters', () => {
	const address = (length: number) => `${'a'.repeat(length - 12)}@example.com`

	expect(parse(email, ` ${address(254).toUpperCase()} `)).toBe(address(254))
	expect(() => parse(email, address(255))).toThrow('Invalid email')
})
