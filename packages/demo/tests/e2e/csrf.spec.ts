import { expect, test } from '@playwright/test'
import { admin, proof } from './helpers'

test('admin API action rejects cross-site session mutation without same-origin proof', async ({ request }) => {
	await request.post('/login?/default', {
		headers: proof('http://127.0.0.1:5180'),
		data: admin,
	})

	const response = await request.post('/admin/sessions?/revoke', {
		headers: { Accept: 'application/json' },
		data: { id: 'missing' },
	})

	expect(response.status()).toBe(403)
})
