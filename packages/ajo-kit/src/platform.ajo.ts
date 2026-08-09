import app from 'runtime:app'
import {
	argon2Hash,
	argon2Verify,
	hmacSha256,
	randomBytes,
	sha256,
	timingSafeEqual,
} from 'runtime:crypto'
import type { Platform } from './platform'

const encoder = new TextEncoder()
const canonical = /^[A-Za-z0-9_-]*$/
const bytes = (data: string | Uint8Array) =>
	typeof data === 'string' ? encoder.encode(data) : data

export const base64UrlDecode: Platform['base64UrlDecode'] = data => {
	if (!canonical.test(data) || data.length % 4 === 1) throw new SyntaxError('Invalid base64url')

	const decoded = Uint8Array.fromBase64(data, { alphabet: 'base64url' })
	if (decoded.toBase64({ alphabet: 'base64url', omitPadding: true }) !== data) {
		throw new SyntaxError('Invalid base64url')
	}

	return decoded
}

export const base64UrlEncode: Platform['base64UrlEncode'] = data =>
	bytes(data).toBase64({ alphabet: 'base64url', omitPadding: true })

export const env: Platform['env'] = name => app.env(name)

export { argon2Hash, argon2Verify }

export const hmacSha256Hex: Platform['hmacSha256Hex'] = (key, data) =>
	hmacSha256(key, data).toHex()

export const randomBase64Url: Platform['randomBase64Url'] = count =>
	randomBytes(count).toBase64({ alphabet: 'base64url', omitPadding: true })

export const sha256Hex: Platform['sha256Hex'] = data => sha256(data).toHex()

export { timingSafeEqual }

export const utf8ByteLength: Platform['utf8ByteLength'] = data => encoder.encode(data).byteLength
