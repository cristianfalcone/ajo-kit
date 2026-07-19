import { afterEach, describe, expect, test } from 'vitest'
import { Failure, Invalid, normalize } from '../src/constants'
import { minLength as min, object, parse, pipe, string } from '../src/validate'

const environment = process.env.NODE_ENV

afterEach(() => {
	if (environment === undefined) delete process.env.NODE_ENV
	else process.env.NODE_ENV = environment
})

describe('ajo-kit validation and errors', () => {
	test('parse returns typed output and throws Invalid with field details', () => {
		const Schema = object({ name: pipe(string(), min(3, 'Name too short')) })

		expect(parse(Schema, { name: 'Ajo' })).toEqual({ name: 'Ajo' })

		try {
			parse(Schema, { name: 'Aj' })
			throw new Error('expected parse to throw')
		} catch (error) {
			expect(error).toBeInstanceOf(Invalid)
			expect((error as Invalid).status).toBe(400)
			expect((error as Invalid).fields.name).toContain('Name too short')
		}
	})

	test('Failure serializes stable status and message', () => {
		expect(new Failure(418, 'Short and stout').toJSON()).toMatchObject({
			status: 418,
			message: 'Short and stout',
		})
	})

	test('Failure masks internal production messages', () => {
		process.env.NODE_ENV = 'production'

		expect(new Failure(500, 'database exploded').toJSON()).toEqual({
			status: 500,
			message: 'Internal Server Error',
		})
		expect(normalize(new Error('secret stack detail')).toJSON()).toEqual({
			status: 500,
			message: 'Internal Server Error',
		})
		expect(new Invalid({ name: ['Required'] }).toJSON()).toMatchObject({
			status: 400,
			message: 'Validation failed',
			fields: { name: ['Required'] },
		})
	})

	test('normalize preserves safe middleware status codes', () => {
		const invalid = Object.assign(new Error('Invalid content'), {
			status: 422,
			details: 'Unexpected token',
		})
		const large = Object.assign(new Error('Exceeded "Content-Length" limit'), { status: 413 })
		const hidden = Object.assign(new Error('teapot'), { status: 399 })

		expect(normalize(invalid).toJSON()).toMatchObject({
			status: 422,
			message: 'Invalid content',
		})
		expect(normalize(large).toJSON()).toMatchObject({
			status: 413,
			message: 'Content Too Large',
		})
		expect(normalize(hidden).toJSON()).toMatchObject({
			status: 500,
			message: 'teapot',
		})
	})
})
