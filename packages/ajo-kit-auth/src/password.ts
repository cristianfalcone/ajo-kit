import { argon2Hash, argon2Verify } from 'ajo-kit/platform'

/** Hashes a plaintext password with Argon2id. */
export const hash = (plain: string) => argon2Hash(plain)

/** Verifies a plaintext password against an Argon2 hash. */
export const verify = (plain: string, hashed: string) => argon2Verify(hashed, plain)
