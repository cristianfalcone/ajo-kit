// Dev-time Node face for Vite, Vitest, and CLI operations, with the engine's
// Argon2id parameters.
import * as argon2 from 'argon2'
import type * as Password from './password'

export const hash: typeof Password.hash = plain =>
	argon2.hash(plain, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 })

export const verify: typeof Password.verify = (plain, hashed) => argon2.verify(hashed, plain)
