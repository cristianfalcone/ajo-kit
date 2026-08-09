import { describe, expect, test } from 'vitest'
import { environment } from '../src/engine-config'

const read = (values: Record<string, string | undefined>) => (name: string) => values[name]

describe('ajo engine environment', () => {
	test('validates required values and applies listener defaults', () => {
		expect(environment(read({ NODE_ENV: 'production', APP_URL: 'https://example.test' }), false)).toEqual({
			database: './database.sqlite',
			host: '0.0.0.0',
			port: 8080,
		})
	})

	test('requires the production environment and application URL', () => {
		expect(() => environment(read({ APP_URL: 'https://example.test' }), false)).toThrow('NODE_ENV')
		expect(() => environment(read({ NODE_ENV: 'production' }), false)).toThrow('APP_URL is required')
		expect(() => environment(read({ NODE_ENV: 'production', APP_URL: 'file:///tmp/app' }), false)).toThrow('HTTP(S)')
	})

	test('requires APP_SECRET only for an auth graph', () => {
		const values = { NODE_ENV: 'production', APP_URL: 'http://localhost' }
		expect(() => environment(read(values), true)).toThrow('APP_SECRET is required')
		expect(() => environment(read(values), false)).not.toThrow()
	})

	test('validates listener overrides', () => {
		const base = { NODE_ENV: 'production', APP_URL: 'http://localhost' }
		expect(environment(read({ ...base, HOST: '::1', PORT: '65535', DATABASE_PATH: ':memory:' }), false)).toEqual({
			database: ':memory:',
			host: '::1',
			port: 65_535,
		})
		expect(() => environment(read({ ...base, HOST: 'http://localhost' }), false)).toThrow('HOST')
		expect(() => environment(read({ ...base, PORT: '0' }), false)).toThrow('PORT')
		expect(() => environment(read({ ...base, PORT: '8080.5' }), false)).toThrow('PORT')
	})
})
