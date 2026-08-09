import { createRequire } from 'node:module'
import { describe, expect, test } from 'vitest'
import { hash, verify } from '../src/password'

const argon2 = createRequire(import.meta.url)('argon2') as typeof import('argon2')
const prefix = '$argon2id$v=19$m=19456,t=2,p=1$'
const fixture = '$argon2id$v=19$m=19456,t=2,p=1$AAECAwQFBgcICQoLDA0ODw$gYJZtjEAJqjg26xdLmknq8/bB7MiWPrE9hsYuA+SkIU'

describe('ajo-kit-auth password', () => {
	test('argon2id hashes verify correct passwords and reject wrong passwords', async () => {
		const hashed = await hash('correct horse battery staple')

		expect(hashed).not.toContain('correct horse battery staple')
		expect(hashed).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/)
		expect(await verify('correct horse battery staple', hashed)).toBe(true)
		expect(await verify('wrong password', hashed)).toBe(false)
	})

	test('verifies the pinned Node PHC vector used for runtime replay', async () => {
		const generated = await argon2.hash('correct horse battery staple', {
			type: argon2.argon2id,
			memoryCost: 19456,
			timeCost: 2,
			parallelism: 1,
			salt: Buffer.from('000102030405060708090a0b0c0d0e0f', 'hex'),
		})

		expect(generated).toBe(fixture)
		expect(generated.startsWith(prefix)).toBe(true)
		expect(await verify('correct horse battery staple', fixture)).toBe(true)
		expect(await verify('wrong password', fixture)).toBe(false)
	})
})
