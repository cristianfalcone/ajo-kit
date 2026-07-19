import { createRequire } from 'node:module'

const require = createRequire(import.meta.resolve('ajo-kit-auth'))
const argon2 = require('argon2') as typeof import('argon2')

const options = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 }

/** Hashes a plaintext password with Argon2id. */
export const hash = (plain: string) => argon2.hash(plain, options)

/** Verifies a plaintext password against an Argon2 hash. */
export const verify = (plain: string, hashed: string) => argon2.verify(hashed, plain)
