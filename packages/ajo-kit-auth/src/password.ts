// The `#password` import picks the engine face (password.ajo.ts) or the
// Node face (password.node.ts); both hash Argon2id with m=19456, t=2, p=1.

/** Hashes a plaintext password with Argon2id. */
export declare function hash(plain: string): Promise<string>

/** Verifies a plaintext password against an Argon2 hash. */
export declare function verify(plain: string, hashed: string): Promise<boolean>
