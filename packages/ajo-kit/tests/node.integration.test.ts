import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { describe, expect, test } from 'vitest'
import { listen } from '../src/node'

describe('ajo-kit node server integration', () => {
	test('strict listen rejects an occupied port instead of incrementing', async () => {
		const busy = createServer((_, res) => res.end('busy'))

		await new Promise<void>((resolve, reject) => {
			busy.listen(0, resolve).once('error', reject)
		})

		const address = busy.address()
		if (!address || typeof address === 'string') throw new Error('Expected TCP test port')

		try {
			await expect(
				listen({ handler: (_: unknown, res: { end: (body: string) => void }) => res.end('ok') }, (address as AddressInfo).port, { strict: true })
			).rejects.toMatchObject({ code: 'EADDRINUSE' })
		} finally {
			await new Promise<void>((resolve, reject) => {
				busy.close(error => error ? reject(error) : resolve())
			})
		}
	})
})
