import { createRequire } from 'node:module'

// Loaded on first use, not on import. argon2 is a native addon, and this
// module is reachable from the package root, so requiring it at evaluation
// time made every consumer carry the binary in its production closure —
// including one that authenticates with passkeys and never hashes a password.
// The kit does the same for its database driver, and for the same reason.
let argon2: typeof import('argon2') | undefined

const load = () => argon2 ??= createRequire(import.meta.resolve('ajo-kit-auth'))('argon2') as typeof import('argon2')

const options = () => ({ type: load().argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 })

/** Hashes a plaintext password with Argon2id. */
export const hash = (plain: string) => load().hash(plain, options())

/** Verifies a plaintext password against an Argon2 hash. */
export const verify = (plain: string, hashed: string) => load().verify(hashed, plain)
