/** Raw or canonically encoded public-key bytes accepted by each host. */
export type PublicKeyBytes = string | Uint8Array

/** Public-key descriptions shared by WebAuthn storage and both hosts. */
export type PublicKey =
	| { kty: 'EC'; crv: 'P-256'; x: PublicKeyBytes; y: PublicKeyBytes }
	| { kty: 'OKP'; crv: 'Ed25519'; x: PublicKeyBytes }
	| { kty: 'RSA'; n: PublicKeyBytes; e: PublicKeyBytes }

// Host capabilities; the package conditions pick the engine, Node or browser face.
// The browser face has only env and base64url.

/** Decodes canonical unpadded base64url into bytes. */
export declare function base64UrlDecode(data: string): Uint8Array
/** Encodes UTF-8 text or raw bytes as canonical unpadded base64url. */
export declare function base64UrlEncode(data: string | Uint8Array): string
/** Reads one environment variable; the browser sees only `import.meta.env`. */
export declare function env(name: string): string | undefined
/** Returns the lowercase HMAC-SHA-256 hex digest of UTF-8 key and data. */
export declare function hmacSha256Hex(key: string, data: string): string
/** Generates a canonical unpadded base64url credential. */
export declare function randomBase64Url(bytes: number): string
/** Generates an RFC 4122 version 4 UUID. */
export declare function randomUUID(): string
/** Returns the lowercase SHA-256 hex digest of UTF-8 text or raw bytes. */
export declare function sha256Hex(data: string | Uint8Array): string
/** Compares two byte arrays without data-dependent early exit. */
export declare function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean
/** Returns the number of bytes in a string's UTF-8 encoding. */
export declare function utf8ByteLength(data: string): number
/** Imports and validates a supported public-key description. */
export declare function validatePublicKey(key: PublicKey): true
/** Verifies a WebAuthn signature with the algorithm implied by its key. */
export declare function verifySignature(key: PublicKey, data: Uint8Array, signature: Uint8Array): boolean
