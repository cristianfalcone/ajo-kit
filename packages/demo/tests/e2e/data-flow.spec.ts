import type { IncomingHttpHeaders } from 'node:http'
import { expect, request as playwright, test } from './test'
import { admin, login, open, proof, vary } from './helpers'

const secure = (headers: Record<string, string | undefined> | IncomingHttpHeaders) => {
	expect(headers['x-content-type-options']).toBe('nosniff')
	expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
	expect(headers['permissions-policy']).toContain('camera=()')
	expect(headers['permissions-policy']).toContain('microphone=()')
	expect(headers['content-security-policy']).toBe("frame-ancestors 'none'")
	expect(headers['strict-transport-security']).toBeUndefined()
}

test('action body parser returns JSON client errors for malformed JSON', async ({ baseURL: base }) => {
	const response = await fetch(`${base}/login?/default`, {
		method: 'POST',
		headers: {
			...proof(base!),
			'Content-Type': 'application/json',
		},
		body: '{bad',
	})

	expect(response.status).toBe(422)
	await expect(response.json()).resolves.toMatchObject({
		error: {
			status: 422,
			message: 'Invalid content',
		},
	})
})

test('security headers are applied to HTML, JSON, API and SSE responses', async ({ request, baseURL: base }) => {
	const html = await request.get('/login', {
		headers: { Accept: 'text/html' },
	})
	expect(html.status()).toBe(200)
	secure(html.headers())

	const json = await request.get('/login', {
		headers: { Accept: 'application/json' },
	})
	expect(json.status()).toBe(200)
	secure(json.headers())

	const api = await request.get('/api/me')
	expect(api.status()).toBe(401)
	secure(api.headers())

	const action = await request.post('/login?/default', {
		headers: proof(base!),
		data: admin,
	})
	expect(action.status()).toBe(200)
	secure(action.headers())

	const sse = await open(base!, '/login')
	secure(sse.res.headers)
	sse.close()
})

test('sealed engine artifact serves a hashed client asset', async ({ request }, testInfo) => {
	test.skip(testInfo.project.name !== 'ajo', 'Requires the externally booted engine artifact')

	const html = await request.get('/login', {
		headers: { Accept: 'text/html' },
	})
	const document = await html.text()
	const path = document.match(/<script[^>]+src="(\/assets\/[^"/]+-[^"/]+\.js)"/)?.[1]

	expect(path).toBeTruthy()
	const script = await request.get(path!)
	expect(script.status()).toBe(200)
	expect(script.headers()['content-type']).toContain('javascript')
	secure(script.headers())
})

test('route data uses no-store JSON, ETag, topics, versions and early 304', async ({ request, baseURL: base }) => {
	const auth = await login(request, base!)
	expect(auth.redirect).toBe('/dashboard')
	expect(auth.topics).toEqual(expect.arrayContaining(['admin:sessions', 'admin:stats', 'user:1']))

	const users = await request.get('/admin/users', {
		headers: { Accept: 'application/json' },
	})

	expect(users.status()).toBe(200)
	expect(users.headers()['content-type']).toContain('application/json')
	expect(users.headers()['cache-control']).toBe('no-store')
	expect(vary(users.headers().vary, 'Accept')).toBe(true)
	expect(vary(users.headers().vary, 'Cookie')).toBe(true)
	expect(users.headers()['x-ajo-cache']).toBe('miss')
	expect(users.headers()['server-timing']).toContain('total;dur=')
	expect(users.headers()['server-timing']).toContain('loader;dur=')
	expect(users.headers()['server-timing']).toContain('render;dur=')
	expect(Number(users.headers()['content-length'])).toBe((await users.body()).byteLength)
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

	const cached = await request.get('/admin/users', {
		headers: {
			Accept: 'application/json',
			'X-Ajo-Scope': body.scope,
			'X-Have': body.hash,
			'X-Ajo-Versions': JSON.stringify(body.versions),
		},
	})

	expect(cached.status()).toBe(304)
	expect(cached.headers()['cache-control']).toBe('no-store')
	expect(vary(cached.headers().vary, 'Accept')).toBe(true)
	expect(vary(cached.headers().vary, 'Cookie')).toBe(true)
	expect(cached.headers()['x-ajo-cache']).toBe('fresh')
	expect(cached.headers()['server-timing']).toContain('total;dur=')
	expect(cached.headers()['server-timing']).toContain('loader;dur=0')
	expect(cached.headers()['content-length']).toBeUndefined()
	secure(cached.headers())
	expect(await cached.text()).toBe('')
})

test('emitted action topics make stale route versions miss early 304', async ({ request, baseURL: base }) => {
	await login(request, base!)

	const before = await request.get('/admin/sessions', {
		headers: { Accept: 'application/json' },
	})
	const body = await before.json()
	const ids = new Set(
		body.data.at(-1).sessions.map((session: { id: string }) => session.id)
	)

	const ctx = await playwright.newContext({ baseURL: base })
	await login(ctx, base!)

	const state = await ctx.storageState()
	const cookie = state.cookies.find(cookie => cookie.name === 'session')

	expect(cookie?.value).toBeTruthy()

	const stale = await request.get('/admin/sessions', {
		headers: {
			Accept: 'application/json',
			'X-Ajo-Scope': body.scope,
			'X-Have': body.hash,
			'X-Ajo-Versions': JSON.stringify(body.versions),
		},
	})

	expect(stale.status()).toBe(200)
	expect(stale.headers()['x-ajo-cache']).toBe('miss')
	const data = await stale.json()
	const row = data.data.at(-1).sessions.find((session: { id: string; email: string }) =>
		session.email === admin.email && !ids.has(session.id)
	)

	expect(row?.id).toBeTruthy()

	const revoke = await request.post('/admin/sessions?/revoke', {
		headers: {
			...proof(base!),
		},
		data: { id: row.id },
	})

	expect(revoke.status()).toBe(200)
	expect(await revoke.json()).toEqual({
		revoked: true,
		topics: ['admin:sessions', 'admin:stats', 'user:1'],
		versions: {
			'admin:sessions': expect.any(Number),
			'admin:stats': expect.any(Number),
			'user:1': expect.any(Number),
		},
	})

	await ctx.dispose()
})
