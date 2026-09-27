import { argon2Hash, argon2Verify } from 'runtime:crypto'
import type * as Password from './password'

export const hash: typeof Password.hash = plain => argon2Hash(plain)

export const verify: typeof Password.verify = (plain, hashed) => argon2Verify(hashed, plain)
