import type * as Platform from './platform'

// The browser face: the environment exposed to the client and base64url,
// which browser WebAuthn ceremonies need. Server primitives are absent, so a
// client import of one fails at build time.

const canonical = /^[A-Za-z0-9_-]*$/
const encoder = new TextEncoder()

export const base64UrlDecode: typeof Platform.base64UrlDecode = data => {
	if (!canonical.test(data) || data.length % 4 === 1) throw new SyntaxError('Invalid base64url')

	const padded = data + '='.repeat((4 - data.length % 4) % 4)
	const binary = atob(padded.replaceAll('-', '+').replaceAll('_', '/'))
	const bytes = Uint8Array.from(binary, character => character.charCodeAt(0))

	if (base64UrlEncode(bytes) !== data) throw new SyntaxError('Invalid base64url')

	return bytes
}

export const base64UrlEncode: typeof Platform.base64UrlEncode = data => {
	const bytes = typeof data === 'string' ? encoder.encode(data) : data
	let binary = ''
	for (const byte of bytes) binary += String.fromCharCode(byte)
	return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

export const env: typeof Platform.env = name => {
	const values = (import.meta as { env?: Record<string, string | undefined> }).env
	return values?.[name]
}
