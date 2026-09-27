import { expect, test } from 'vitest'
import { parse } from 'ajo-kit/validate'
import { confirmed, email } from '../../src/data/fields'

test('email accepts at most 254 characters', () => {
	const address = (length: number) => `${'a'.repeat(length - 12)}@example.com`

	expect(parse(email, ` ${address(254).toUpperCase()} `)).toBe(address(254))
	expect(() => parse(email, address(255))).toThrow('Invalid email')
})

test('confirmed requires the confirmation to match the password', () => {
	const schema = confirmed({})

	expect(parse(schema, { password: 'password1', confirm: 'password1' })).toEqual({ password: 'password1', confirm: 'password1' })
	expect(() => parse(schema, { password: 'password1', confirm: 'password2' })).toThrow('Passwords must match')
})
