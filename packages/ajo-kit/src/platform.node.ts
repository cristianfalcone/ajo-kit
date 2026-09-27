// Dev-time Node shim for Vite, Vitest, and CLI operations. Production
// executes only on the ajo engine — the kit ships no Node serving path.
import {
	createHash,
	createHmac,
	createPublicKey,
	randomBytes,
	randomUUID as uuid,
	timingSafeEqual as equal,
	verify,
} from 'node:crypto'
import type * as Platform from './platform'

const canonical = /^[A-Za-z0-9_-]*$/

const bytes = (data: string | Uint8Array) =>
	typeof data === 'string' ? Buffer.from(data) : data

const keyBytes = (value: Platform.PublicKeyBytes, name: string): Uint8Array => {
	if (value instanceof Uint8Array) return value
	try { return base64UrlDecode(value) }
	catch { throw new TypeError(`key.${name} must be canonical unpadded base64url`) }
}

const shape = (key: Platform.PublicKey, properties: string[]) => {
	if (!key || typeof key !== 'object' || Array.isArray(key)) {
		throw new TypeError('public key must be a plain key object')
	}
	const held = Reflect.ownKeys(key)
	if (held.length !== properties.length || properties.some(property => !held.includes(property))) {
		throw new TypeError('public key has an unsupported shape')
	}
}

const jwk = (key: Platform.PublicKey): JsonWebKey => {
	if (key.kty === 'EC') {
		shape(key, ['kty', 'crv', 'x', 'y'])
		if (key.crv !== 'P-256') throw new TypeError('unsupported key curve')
		const x = keyBytes(key.x, 'x')
		const y = keyBytes(key.y, 'y')
		if (x.byteLength !== 32 || y.byteLength !== 32) {
			throw new TypeError('EC P-256 coordinates must be 32 bytes')
		}
		return { kty: key.kty, crv: key.crv, x: base64UrlEncode(x), y: base64UrlEncode(y) }
	}

	if (key.kty === 'OKP') {
		shape(key, ['kty', 'crv', 'x'])
		if (key.crv !== 'Ed25519') throw new TypeError('unsupported key curve')
		const x = keyBytes(key.x, 'x')
		if (x.byteLength !== 32) throw new TypeError('Ed25519 public key must be 32 bytes')
		return { kty: key.kty, crv: key.crv, x: base64UrlEncode(x) }
	}

	if (key.kty === 'RSA') {
		shape(key, ['kty', 'n', 'e'])
		const n = keyBytes(key.n, 'n')
		const e = keyBytes(key.e, 'e')
		if (n.byteLength < 256 || (n.byteLength === 256 && !(n[0]! & 0x80))) {
			throw new TypeError('RSA modulus too small')
		}
		if (n.byteLength > 512 || !e.byteLength || e.byteLength > 512 || n[0] === 0 || e[0] === 0) {
			throw new TypeError('RSA public key is malformed')
		}
		return { kty: key.kty, n: base64UrlEncode(n), e: base64UrlEncode(e) }
	}

	throw new TypeError('unsupported key type')
}

const imported = (key: Platform.PublicKey) => {
	try { return createPublicKey({ key: jwk(key), format: 'jwk' }) }
	catch { throw new TypeError('public key is invalid') }
}

export const base64UrlDecode: typeof Platform.base64UrlDecode = data => {
	if (!canonical.test(data) || data.length % 4 === 1) throw new SyntaxError('Invalid base64url')

	const decoded = Buffer.from(data, 'base64url')
	if (decoded.toString('base64url') !== data) throw new SyntaxError('Invalid base64url')

	// A plain Uint8Array, not a Buffer: the contract is host-neutral and the
	// ajo face can only ever return Uint8Array.
	return Uint8Array.from(decoded)
}

export const base64UrlEncode: typeof Platform.base64UrlEncode = data =>
	Buffer.from(bytes(data)).toString('base64url')

export const env: typeof Platform.env = name =>
	typeof process === 'undefined' ? undefined : process.env[name]

export const hmacSha256Hex: typeof Platform.hmacSha256Hex = (key, data) =>
	createHmac('sha256', key).update(data).digest('hex')

export const randomBase64Url: typeof Platform.randomBase64Url = count =>
	randomBytes(count).toString('base64url')

export const randomUUID: typeof Platform.randomUUID = uuid

export const sha256Hex: typeof Platform.sha256Hex = data =>
	createHash('sha256').update(data).digest('hex')

export const timingSafeEqual: typeof Platform.timingSafeEqual = (left, right) =>
	left.byteLength === right.byteLength && equal(left, right)

export const utf8ByteLength: typeof Platform.utf8ByteLength = data =>
	Buffer.byteLength(data)

export const validatePublicKey: typeof Platform.validatePublicKey = key => {
	imported(key)
	return true
}

export const verifySignature: typeof Platform.verifySignature = (key, data, signature) => {
	const publicKey = imported(key)
	try {
		if (key.kty === 'OKP') return verify(null, data, publicKey, signature)
		return verify('sha256', data, { key: publicKey, dsaEncoding: 'der' }, signature)
	} catch {
		return false
	}
}
