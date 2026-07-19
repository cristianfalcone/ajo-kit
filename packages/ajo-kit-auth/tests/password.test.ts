import { describe, expect, test } from 'vitest'
import { hash, verify } from '../src/password'

describe('ajo-kit-auth password', () => {
	test('argon2id hashes verify correct passwords and reject wrong passwords', async () => {
		const hashed = await hash('correct horse battery staple')

		expect(hashed).not.toContain('correct horse battery staple')
		expect(await verify('correct horse battery staple', hashed)).toBe(true)
		expect(await verify('wrong password', hashed)).toBe(false)
	})
})
