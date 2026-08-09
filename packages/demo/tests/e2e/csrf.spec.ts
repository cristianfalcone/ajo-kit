import { expect, test } from './test'
import { admin, proof } from './helpers'

test('admin API action rejects cross-site session mutation without same-origin proof', async ({ request, baseURL }) => {
	await request.post('/login?/default', {
		headers: proof(baseURL!),
		data: admin,
	})

	const response = await request.post('/admin/sessions?/revoke', {
		headers: { Accept: 'application/json' },
		data: { id: 'missing' },
	})

	expect(response.status()).toBe(403)
})
