import { inspect } from 'node:util'
import { Failure } from 'ajo-kit'
import { describe, expect, test, vi } from 'vitest'
import {
	classify,
	Refused,
	Undelivered,
	type DeliveryCode,
	type RefusalCode,
} from '../src/errors'

const deliveries = [
	{ signal: { name: 'AbortError' }, code: 'timeout', retryable: true },
	{ signal: { name: 'Undelivered', code: 'busy' }, code: 'busy', retryable: true },
	{ signal: { code: 'ECONNRESET' }, code: 'connection', retryable: true },
	{ signal: { code: 'ERR_TLS_CERT_ALTNAME_INVALID' }, code: 'tls', retryable: false },
	{ signal: { status: 401 }, code: 'auth', retryable: false, hint: 'status 401' },
	{ signal: { responseCode: 550 }, code: 'rejected', retryable: false, hint: 'smtp 550' },
	{ signal: { status: 429 }, code: 'throttled', retryable: true, hint: 'status 429' },
	{ signal: { statusCode: 503 }, code: 'unavailable', retryable: true, hint: 'status 503' },
	{ signal: {}, code: 'unknown', retryable: false },
] satisfies readonly {
	signal: unknown
	code: DeliveryCode
	retryable: boolean
	hint?: string
}[]

const configuration = [
	'no-transport',
	'invalid-config',
	'invalid-sender',
] satisfies readonly RefusalCode[]

const message = [
	'invalid-recipient',
	'invalid-subject',
	'invalid-name',
	'invalid-kind',
	'invalid-key',
	'empty-body',
	'too-large',
	'expired',
] satisfies readonly RefusalCode[]

describe('ajo-kit-mail errors', () => {
	test.each(deliveries)('classifies provider shape as $code', ({ signal, code, retryable, hint }) => {
		const result = classify(signal)

		expect(result).toBeInstanceOf(Undelivered)
		expect(result).toMatchObject({
			status: 502,
			code,
			retryable,
			...(hint && { hint }),
		})
		expect(result.hint).toBe(hint)
	})

	test('destroys provider prose before returning an error', () => {
		let result!: Undelivered

		try {
			throw {
				status: 429,
				message: 'token abc123',
				response: 'user@example.com rejected',
				cause: new Error('smtp said user@example.com'),
			}
		} catch (error) {
			result = classify(error)
		}

		const rendered = [
			inspect(result, { depth: 8 }),
			JSON.stringify(result),
		]

		expect(result).toBeInstanceOf(Failure)
		expect(result.status).toBe(502)
		expect(rendered.every(value => !value.includes('abc123'))).toBe(true)
		expect(rendered.every(value => !value.includes('user@example.com'))).toBe(true)
	})

	test.each(configuration)('uses status 500 for configuration refusal %s', code => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {})
		const result = new Refused(code)

		expect(result.status).toBe(500)
		expect(result.message).toBe(`Mail refused: ${code}`)
		expect(result.message).not.toContain('token abc123')
		expect(log).toHaveBeenCalledWith(`[mail] refused: ${code}`)
	})

	test.each(message)('uses status 422 for message refusal %s', code => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {})
		const result = new Refused(code)

		expect(result.status).toBe(422)
		expect(result.message).toBe(`Mail refused: ${code}`)
		expect(result.message).not.toContain('token abc123')
		expect(log).not.toHaveBeenCalled()
	})

	test('parenthesises connection timeout classification around the missing status', () => {
		expect(classify({ code: 'ETIMEDOUT', responseCode: 451 }).code).toBe('timeout')
		expect(classify({ code: 'ECONNECTION', responseCode: 451 }).code).toBe('throttled')
	})

	test('reads only provider shape fields', () => {
		const reads: PropertyKey[] = []
		const signal = new Proxy({
			name: 'Error',
			code: 'ECONNECTION',
			responseCode: undefined,
			status: undefined,
			statusCode: undefined,
		}, {
			get: (target, property, receiver) => {
				reads.push(property)
				return Reflect.get(target, property, receiver)
			},
		})

		classify(signal)

		expect(reads).toEqual([
			'name',
			'code',
			'responseCode',
			'status',
			'statusCode',
		])
	})
})
