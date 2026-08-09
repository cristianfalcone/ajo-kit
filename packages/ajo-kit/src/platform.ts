/** Host capabilities required by the ajo-kit core runtime. */
export interface Platform {
	/** Decodes canonical unpadded base64url into bytes. */
	base64UrlDecode(data: string): Uint8Array
	/** Encodes UTF-8 text or raw bytes as canonical unpadded base64url. */
	base64UrlEncode(data: string | Uint8Array): string
	/** Reads one environment variable. */
	env(name: string): string | undefined
	/** Hashes a plaintext password as an Argon2id PHC string. */
	argon2Hash(plain: string): Promise<string>
	/** Verifies plaintext against an Argon2 PHC string. */
	argon2Verify(phc: string, plain: string): Promise<boolean>
	/** Returns the lowercase HMAC-SHA-256 hex digest of UTF-8 key and data. */
	hmacSha256Hex(key: string, data: string): string
	/** Generates a canonical unpadded base64url credential. */
	randomBase64Url(bytes: number): string
	/** Returns the lowercase SHA-256 hex digest of UTF-8 text or raw bytes. */
	sha256Hex(data: string | Uint8Array): string
	/** Compares two byte arrays without data-dependent early exit. */
	timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean
	/** Returns the number of bytes in a string's UTF-8 encoding. */
	utf8ByteLength(data: string): number
}

/** Type shim for the condition-selected base64url decoder. */
export declare const base64UrlDecode: Platform['base64UrlDecode']
/** Type shim for the condition-selected base64url encoder. */
export declare const base64UrlEncode: Platform['base64UrlEncode']
/** Type shim for the condition-selected environment implementation. */
export declare const env: Platform['env']
/** Type shim for the condition-selected Argon2 hash implementation. */
export declare const argon2Hash: Platform['argon2Hash']
/** Type shim for the condition-selected Argon2 verification implementation. */
export declare const argon2Verify: Platform['argon2Verify']
/** Type shim for the condition-selected HMAC implementation. */
export declare const hmacSha256Hex: Platform['hmacSha256Hex']
/** Type shim for the condition-selected random credential implementation. */
export declare const randomBase64Url: Platform['randomBase64Url']
/** Type shim for the condition-selected SHA-256 implementation. */
export declare const sha256Hex: Platform['sha256Hex']
/** Type shim for the condition-selected constant-time comparison. */
export declare const timingSafeEqual: Platform['timingSafeEqual']
/** Type shim for the condition-selected UTF-8 implementation. */
export declare const utf8ByteLength: Platform['utf8ByteLength']
