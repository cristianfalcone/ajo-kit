import argon2 from 'argon2'

const options = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 }

export const hash = (plain: string) => argon2.hash(plain, options)

export const verify = (plain: string, hashed: string) => argon2.verify(hashed, plain)
