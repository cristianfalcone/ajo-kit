import { expect, request as playwrightRequest, test } from '@playwright/test'
import { actionHeaders, adminCredentials, loginRequest } from './helpers'

const varyIncludes = (value: string | undefined, token: string) =>
	value?.toLowerCase().split(',').map(part => part.trim()).includes(token.toLowerCase())

test('CSRF rejects cross-site JSON actions without same-origin proof', async ({ request }) => {
	const response = await request.post('/login?/default', {
		headers: { Accept: 'application/json' },
		data: adminCredentials,
	})

	expect(response.status()).toBe(403)
	expect(await response.json()).toMatchObject({
		error: {
			status: 403,
			message: 'Invalid CSRF token',
		},
	})
})

test('route data uses no-store JSON, ETag, topics, versions and early 304', async ({ request, baseURL }) => {
	const login = await loginRequest(request, baseURL!)
	expect(login.redirect).toBe('/dashboard')
	expect(login.topics).toEqual(expect.arrayContaining(['admin:sessions', 'admin:stats', 'user:1']))

	const users = await request.get('/admin/users', {
		headers: { Accept: 'application/json' },
	})

	expect(users.status()).toBe(200)
	expect(users.headers()['content-type']).toContain('application/json')
	expect(users.headers()['cache-control']).toBe('no-store')
	expect(varyIncludes(users.headers().vary, 'Accept')).toBe(true)
	expect(varyIncludes(users.headers().vary, 'Cookie')).toBe(true)
	expect(users.headers()['x-ajo-cache']).toBe('miss')
	expect(users.headers()['server-timing']).toContain('total;dur=')
	expect(users.headers()['server-timing']).toContain('loader;dur=')
	expect(users.headers()['server-timing']).toContain('render;dur=')
	expect(Number(users.headers()['x-ajo-bytes'])).toBeGreaterThan(0)
	expect(users.headers().etag).toBeTruthy()

	const body = await users.json()
	expect(body.hash).toBeTruthy()
	expect(body.topics).toEqual(expect.arrayContaining(['admin:users', 'user:1']))
	expect(body.versions).toMatchObject({
		'admin:users': expect.any(Number),
		'user:1': expect.any(Number),
	})
	expect(Array.isArray(body.data)).toBe(true)

	const sessions = await request.get('/admin/sessions', {
		headers: { Accept: 'application/json' },
	})

	expect(sessions.status()).toBe(200)

	const cachedUsers = await request.get('/admin/users', {
		headers: {
			Accept: 'application/json',
			'X-Have': body.hash,
			'X-Ajo-Versions': JSON.stringify(body.versions),
		},
	})

	expect(cachedUsers.status()).toBe(304)
	expect(cachedUsers.headers()['cache-control']).toBe('no-store')
	expect(varyIncludes(cachedUsers.headers().vary, 'Accept')).toBe(true)
	expect(varyIncludes(cachedUsers.headers().vary, 'Cookie')).toBe(true)
	expect(cachedUsers.headers()['x-ajo-cache']).toBe('fresh')
	expect(cachedUsers.headers()['server-timing']).toContain('total;dur=')
	expect(cachedUsers.headers()['server-timing']).toContain('loader;dur=0')
	expect(cachedUsers.headers()['x-ajo-bytes']).toBe('0')
	expect(await cachedUsers.text()).toBe('')
})

test('emitted action topics make stale route versions miss early 304', async ({ request, baseURL }) => {
	await loginRequest(request, baseURL!)

	const before = await request.get('/admin/sessions', {
		headers: { Accept: 'application/json' },
	})
	const beforeBody = await before.json()

	const other = await playwrightRequest.newContext({ baseURL })
	await loginRequest(other, baseURL!)

	const otherState = await other.storageState()
	const otherSession = otherState.cookies.find(cookie => cookie.name === 'session')

	expect(otherSession?.value).toBeTruthy()

	const staleAfterLogin = await request.get('/admin/sessions', {
		headers: {
			Accept: 'application/json',
			'X-Have': beforeBody.hash,
			'X-Ajo-Versions': JSON.stringify(beforeBody.versions),
		},
	})

	expect(staleAfterLogin.status()).toBe(200)
	expect(staleAfterLogin.headers()['x-ajo-cache']).toBe('miss')

	const revoke = await request.post('/admin/sessions?/revoke', {
		headers: {
			...actionHeaders(baseURL!),
		},
		data: { id: otherSession!.value.slice(0, 8) },
	})

	expect(revoke.status()).toBe(200)
	expect(await revoke.json()).toMatchObject({
		revoked: true,
		topics: expect.arrayContaining(['admin:sessions', 'admin:stats', 'sessions:1', 'user:1']),
		versions: {
			'admin:sessions': expect.any(Number),
			'admin:stats': expect.any(Number),
			'sessions:1': expect.any(Number),
			'user:1': expect.any(Number),
		},
	})

	await other.dispose()
})
