/** Host capabilities required by the ajo-kit core runtime. */
export interface Platform {
	/** Reads one environment variable. */
	env(name: string): string | undefined
	/** Returns the lowercase SHA-256 hex digest of UTF-8 text or raw bytes. */
	sha256Hex(data: string | Uint8Array): string
	/** Returns the number of bytes in a string's UTF-8 encoding. */
	utf8ByteLength(data: string): number
}

/** Type shim for the condition-selected environment implementation. */
export declare const env: Platform['env']
/** Type shim for the condition-selected SHA-256 implementation. */
export declare const sha256Hex: Platform['sha256Hex']
/** Type shim for the condition-selected UTF-8 implementation. */
export declare const utf8ByteLength: Platform['utf8ByteLength']
