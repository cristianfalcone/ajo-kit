import { expect, test } from 'vitest'
import { start } from './server'

test('login attempts remain bounded when one address changes email targets', async () => {
	const app = await start()
	try {
		const statuses: number[] = []
		for (let index = 0; index < 21; index++) {
			const response = await fetch(`${app.url}/login`, {
				method: 'POST',
				headers: { Accept: 'application/json', 'Content-Type': 'application/json', Origin: app.url },
				body: JSON.stringify({ email: `absent-${index}@example.test`, password: 'invalid-test-password' }),
			})
			statuses.push(response.status)
		}
		expect(statuses).toEqual([...Array.from({ length: 20 }, () => 401), 429])
	} finally {
		await app.close()
	}
}, 60_000)
