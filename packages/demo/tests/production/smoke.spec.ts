import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const secure = (headers: Record<string, string | undefined>) => {
	expect(headers['x-content-type-options']).toBe('nosniff')
	expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
	expect(headers['permissions-policy']).toContain('camera=()')
	expect(headers['permissions-policy']).toContain('microphone=()')
	expect(headers['content-security-policy']).toBe("frame-ancestors 'none'")
	expect(headers['strict-transport-security']).toBeUndefined()
}

const asset = () => {
	const html = readFileSync('dist/client/index.html', 'utf8')
	const match = html.match(/src="(\/assets\/[^"]+\.js)"/)

	if (!match) throw new Error('Missing built client asset')

	return match[1]
}

test('built production server serves core smoke paths', async ({ request, baseURL }) => {
	const html = await request.get('/login', {
		headers: { Accept: 'text/html' },
	})

	expect(html.status()).toBe(200)
	expect(await html.text()).toContain('Sign In')
	secure(html.headers())

	const script = await request.get(asset())
	expect(script.status()).toBe(200)
	secure(script.headers())
	expect(script.headers()['content-type']).toContain('javascript')

	const route = await request.get('/login', {
		headers: { Accept: 'application/json' },
	})
	const payload = await route.json()

	expect(route.status()).toBe(200)
	expect(route.headers()['cache-control']).toBe('no-store')
	expect(payload.hash).toBeTruthy()
	expect(payload.topics).toEqual(['registration:policy'])
	expect(payload.versions).toEqual({ 'registration:policy': 0 })

	const malformed = await fetch(`${baseURL}/login?/default`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Origin: baseURL!,
		},
		body: '{bad',
	})

	expect(malformed.status).toBe(422)
	await expect(malformed.json()).resolves.toMatchObject({
		error: {
			status: 422,
			message: 'Invalid content',
		},
	})
})
