import app from 'runtime:app'
import {
	hmacSha256,
	randomBytes,
	randomUUID as uuid,
	sha256,
	timingSafeEqual,
	validatePublicKey as validate,
	verify,
} from 'runtime:crypto'
import type * as Platform from './platform'

const encoder = new TextEncoder()
const canonical = /^[A-Za-z0-9_-]*$/
const bytes = (data: string | Uint8Array) =>
	typeof data === 'string' ? encoder.encode(data) : data

export const base64UrlDecode: typeof Platform.base64UrlDecode = data => {
	if (!canonical.test(data) || data.length % 4 === 1) throw new SyntaxError('Invalid base64url')

	const decoded = Uint8Array.fromBase64(data, { alphabet: 'base64url' })
	if (decoded.toBase64({ alphabet: 'base64url', omitPadding: true }) !== data) {
		throw new SyntaxError('Invalid base64url')
	}

	return decoded
}

export const base64UrlEncode: typeof Platform.base64UrlEncode = data =>
	bytes(data).toBase64({ alphabet: 'base64url', omitPadding: true })

export const env: typeof Platform.env = name => app.env(name)

export const hmacSha256Hex: typeof Platform.hmacSha256Hex = (key, data) =>
	hmacSha256(key, data).toHex()

export const randomBase64Url: typeof Platform.randomBase64Url = count =>
	randomBytes(count).toBase64({ alphabet: 'base64url', omitPadding: true })

export const randomUUID: typeof Platform.randomUUID = uuid

export const sha256Hex: typeof Platform.sha256Hex = data => sha256(data).toHex()

export { timingSafeEqual }

export const validatePublicKey: typeof Platform.validatePublicKey = validate

export const verifySignature: typeof Platform.verifySignature = verify

export const utf8ByteLength: typeof Platform.utf8ByteLength = data => encoder.encode(data).byteLength
