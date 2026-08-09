import type { Platform } from './platform'

// The browser face of the platform seam. The client graph reaches this module
// through the shared constants; only the portable pieces may execute there.
// Server-only crypto throws loudly — client code has no business calling it,
// and a clear error beats a broken import of an externalized node builtin.

const canonical = /^[A-Za-z0-9_-]*$/

const serverOnly = (name: string) => {
	throw new Error(`${name} is server-only`)
}

const encoder = new TextEncoder()

export const base64UrlDecode: Platform['base64UrlDecode'] = data => {
	if (!canonical.test(data) || data.length % 4 === 1) throw new SyntaxError('Invalid base64url')

	const padded = data + '='.repeat((4 - data.length % 4) % 4)
	const binary = atob(padded.replaceAll('-', '+').replaceAll('_', '/'))
	const bytes = Uint8Array.from(binary, character => character.charCodeAt(0))

	if (base64UrlEncode(bytes) !== data) throw new SyntaxError('Invalid base64url')

	return bytes
}

export const base64UrlEncode: Platform['base64UrlEncode'] = data => {
	const bytes = typeof data === 'string' ? encoder.encode(data) : data
	let binary = ''
	for (const byte of bytes) binary += String.fromCharCode(byte)
	return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

export const env: Platform['env'] = name => {
	const values = (import.meta as { env?: Record<string, string | undefined> }).env
	return values?.[name]
}

export const argon2Hash: Platform['argon2Hash'] = () => serverOnly('argon2Hash')

export const argon2Verify: Platform['argon2Verify'] = () => serverOnly('argon2Verify')

export const hmacSha256Hex: Platform['hmacSha256Hex'] = () => serverOnly('hmacSha256Hex')

export const randomBase64Url: Platform['randomBase64Url'] = count =>
	base64UrlEncode(crypto.getRandomValues(new Uint8Array(count)))

export const randomUUID: Platform['randomUUID'] = () => crypto.randomUUID()

export const sha256Hex: Platform['sha256Hex'] = () => serverOnly('sha256Hex')

export const timingSafeEqual: Platform['timingSafeEqual'] = () => serverOnly('timingSafeEqual')

export const utf8ByteLength: Platform['utf8ByteLength'] = data =>
	encoder.encode(data).byteLength

export const validatePublicKey: Platform['validatePublicKey'] = () => serverOnly('validatePublicKey')

export const verifySignature: Platform['verifySignature'] = () => serverOnly('verifySignature')
