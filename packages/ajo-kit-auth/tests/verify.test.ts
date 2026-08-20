import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { db } from 'ajo-kit/database'
import { sign, url, validate } from '../src/verify'
import { setup, teardown } from './database.fixture'

const environment = process.env.NODE_ENV
const secret = process.env.APP_SECRET

const restore = (key: string, value: string | undefined) => {
	if (value === undefined) delete process.env[key]
	else process.env[key] = value
}

beforeEach(async () => {
	vi.useFakeTimers()
	vi.setSystemTime(new Date('2026-06-19T00:00:00Z'))
	process.env.NODE_ENV = 'development'
	process.env.APP_SECRET = 'slice-nine-vector-secret'
	await setup()
	await db<any>().insertInto('users').values({
		id: 42,
		name: 'Verification User',
		email: 'user@example.test',
		password: null,
		verified: null,
	}).execute()
})

afterEach(async () => {
	await teardown()
	restore('NODE_ENV', environment)
	restore('APP_SECRET', secret)
	vi.restoreAllMocks()
	vi.useRealTimers()
})

describe('ajo-kit-auth email verification', () => {
	test('signatures bind normalized email, reject tampering, mark verified, and expire', async () => {
		const signature = sign(42, ' USER@Example.test ')
		expect(signature).toBe(
			'NDI6MTc4MTkxMzYwMDAwMDpkWE5sY2tCbGVHRnRjR3hsTG5SbGMzUTo5MjAzMWExMTlhMDBiMTQxZDA0YWVhMDU5OTk3ZmY0MWQ3MmUzZDcwNTUzMGY4YWE4YTVkZjk4YWNiYTY4MDRi'
		)
		const [, expiry, email, value] = Buffer.from(signature, 'base64url').toString().split(':')
		const tampered = Buffer.from('43:' + expiry + ':' + email + ':' + value).toString('base64url')

		await expect(validate(signature)).resolves.toBe(42)
		await expect(validate(tampered)).resolves.toBeNull()
		await expect(validate(signature + '=')).resolves.toBeNull()
		await expect(validate(signature + '\n')).resolves.toBeNull()
		expect(url(42, 'user@example.test', 'https://app.test')).toBe('https://app.test/verify/' + signature)
		await expect(db<any>().selectFrom('users').select('verified').where('id', '=', 42)
			.executeTakeFirstOrThrow()).resolves.toEqual({ verified: '2026-06-19T00:00:00.000Z' })

		vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1)
		await expect(validate(signature)).resolves.toBeNull()
	})

	test('a signature minted before an email change cannot verify the new address', async () => {
		const signature = sign(42, 'user@example.test')

		await db<any>().updateTable('users').set({ email: 'changed@example.test' }).where('id', '=', 42).execute()

		await expect(validate(signature)).resolves.toBeNull()
		await expect(db<any>().selectFrom('users').select(['email', 'verified']).where('id', '=', 42)
			.executeTakeFirstOrThrow()).resolves.toEqual({
			email: 'changed@example.test',
			verified: null,
		})
	})

	test('an already verified matching account succeeds without another write', async () => {
		const verified = '2026-06-18T12:00:00.000Z'
		await db<any>().updateTable('users').set({ verified }).where('id', '=', 42).execute()
		const signature = sign(42, 'USER@example.test')

		vi.advanceTimersByTime(60_000)

		await expect(validate(signature)).resolves.toBe(42)
		await expect(db<any>().selectFrom('users').select('verified').where('id', '=', 42)
			.executeTakeFirstOrThrow()).resolves.toEqual({ verified })
	})

	test('fails closed without a production secret', async () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {})

		process.env.NODE_ENV = 'production'
		delete process.env.APP_SECRET

		expect(() => sign(42, 'user@example.test')).toThrow('APP_SECRET must be set to a strong production secret')
		await expect(validate('anything')).rejects.toThrow('APP_SECRET must be set to a strong production secret')

		process.env.APP_SECRET = 'change-in-production'
		expect(() => sign(42, 'user@example.test')).toThrow('APP_SECRET must be set to a strong production secret')

		process.env.APP_SECRET = 'your-secret-key'
		expect(() => sign(42, 'user@example.test')).toThrow('APP_SECRET must be set to a strong production secret')

		process.env.APP_SECRET = 'test-production-secret-0000000000'
		const signature = sign(42, 'user@example.test')

		await expect(validate(signature)).resolves.toBe(42)
		expect(log).toHaveBeenCalledWith('[security] APP_SECRET must be set to a strong production secret')
	})
})
