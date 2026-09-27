import { expect, test } from './test'
import { login, proof } from './helpers'

test('cookie sessions need same-origin proof for API routes and page actions', async ({ request, baseURL: base, fixture }) => {
	const email = `csrf-${Date.now()}@example.com`
	const token = { name: 'CSRF Token', abilities: ['tokens:read'] }
	await fixture.makeUser({ email, name: 'CSRF User' })
	await login(request, base!, { email, password: 'password' })

	const api = await request.post('/api/tokens', { data: token })
	expect(api.status()).toBe(403)
	await expect(api.json()).resolves.toMatchObject({ message: 'Invalid CSRF token' })

	const action = await request.post('/account/tokens?/make', {
		headers: { Accept: 'application/json' },
		data: token,
	})
	expect(action.status()).toBe(403)
	await expect(action.json()).resolves.toMatchObject({ error: { message: 'Invalid CSRF token' } })

	const session = (await request.storageState()).cookies.find(cookie => cookie.name === 'session')
	expect(session?.value).toBeTruthy()

	const forged = await fetch(`${base}/api/tokens`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Cookie: `session=${session?.value}; XSRF-TOKEN=forged`,
			'X-XSRF-TOKEN': 'forged',
		},
		body: JSON.stringify(token),
	})
	expect(forged.status).toBe(403)
	await expect(forged.json()).resolves.toMatchObject({ message: 'Invalid CSRF token' })

	const allowed = await request.post('/api/tokens', { headers: proof(base!), data: token })
	expect(allowed.status()).toBe(201)
	await expect(allowed.json()).resolves.toMatchObject({ token: expect.any(String) })
})
