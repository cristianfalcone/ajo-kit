import { expect, request as playwrightRequest, test } from '@playwright/test'

const credentials = {
	email: 'cristian@example.com',
	password: 'password',
}

async function login(request: any, baseURL: string) {
	const response = await request.post('/login?/default', {
		headers: {
			Accept: 'application/json',
			Origin: baseURL,
		},
		data: credentials,
	})

	expect(response.status()).toBe(200)

	const json = await response.json()
	expect(json.redirect).toBe('/dashboard')
	expect(json.topics).toEqual(expect.arrayContaining(['admin:sessions', 'admin:stats', 'user:1']))

	return json
}

test('CSRF rejects cross-site JSON actions without same-origin proof', async ({ request }) => {
	const response = await request.post('/login?/default', {
		headers: { Accept: 'application/json' },
		data: credentials,
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
	await login(request, baseURL!)

	const users = await request.get('/admin/users', {
		headers: { Accept: 'application/json' },
	})

	expect(users.status()).toBe(200)
	expect(users.headers()['cache-control']).toBe('no-store')
	expect(users.headers()['x-ajo-cache']).toBe('miss')
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
	expect(cachedUsers.headers()['x-ajo-cache']).toBe('fresh')
	expect(await cachedUsers.text()).toBe('')
})

test('emitted action topics make stale route versions miss early 304', async ({ request, baseURL }) => {
	await login(request, baseURL!)

	const before = await request.get('/admin/sessions', {
		headers: { Accept: 'application/json' },
	})
	const beforeBody = await before.json()

	const other = await playwrightRequest.newContext({ baseURL })
	await login(other, baseURL!)

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
			Accept: 'application/json',
			Origin: baseURL!,
		},
		data: { id: otherSession!.value.slice(0, 8) },
	})

	expect(revoke.status()).toBe(200)
	expect(await revoke.json()).toMatchObject({
		revoked: true,
		topics: expect.arrayContaining(['admin:sessions', 'admin:stats', 'sessions:1', 'user:1']),
	})

	await other.dispose()
})
