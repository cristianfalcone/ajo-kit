import { afterEach, describe, expect, test } from 'vitest'
import { clear, read, write } from '../src/cookie'

const environment = process.env.NODE_ENV

const response = () => {
	const headers = new Map<string, string>()
	return {
		headers,
		res: {
			setHeader(name: string, value: string) {
				headers.set(name, value)
			},
		},
	}
}

afterEach(() => {
	if (environment === undefined) delete process.env.NODE_ENV
	else process.env.NODE_ENV = environment
})

describe('ajo-kit-auth cookie', () => {
	test('writes, reads and clears the session cookie with safe defaults', () => {
		const { headers, res } = response()

		write(res as any, 'session-token', true)

		expect(headers.get('Set-Cookie')).toBe('session=session-token; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000')
		expect(read({ headers: { cookie: 'theme=dark; session=session-token' } } as any)).toBe('session-token')
		expect(read({ headers: { cookie: 'not_session=wrong' } } as any)).toBeUndefined()
		expect(read({ headers: { cookie: 'not_session=wrong; session=real-session' } } as any)).toBe('real-session')
		expect(read({ headers: { cookie: 'session_id=wrong; xsession=wrong' } } as any)).toBeUndefined()
		expect(read({ headers: { cookie: 'session=first; session=second' } } as any)).toBeUndefined()

		clear(res as any)

		expect(headers.get('Set-Cookie')).toBe('session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0')
	})

	test('sets Secure on session cookies in production', () => {
		process.env.NODE_ENV = 'production'
		const { headers, res } = response()

		write(res as any, 'session-token')

		expect(headers.get('Set-Cookie')).toBe('session=session-token; HttpOnly; SameSite=Lax; Path=/; Secure; Max-Age=2592000')
	})
})
