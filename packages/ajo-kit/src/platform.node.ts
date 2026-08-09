import {
	createHash,
	createHmac,
	createPublicKey,
	randomBytes,
	randomUUID as uuid,
	timingSafeEqual as equal,
	verify,
} from 'node:crypto'
import { createRequire } from 'node:module'
import type { Platform, PublicKey, PublicKeyBytes } from './platform'

type Argon2 = {
	readonly argon2id: number
	hash(plain: string, options: {
		type: number
		memoryCost: number
		timeCost: number
		parallelism: number
	}): Promise<string>
	verify(phc: string, plain: string): Promise<boolean>
}

const canonical = /^[A-Za-z0-9_-]*$/

let argon2: Argon2 | undefined

// argon2 remains an ajo-kit-auth dependency. This source and the packed dist
// face are both one directory below their package, so the sibling anchor works
// in the workspace and for strict node_modules layouts without hoisting.
// Lazy: createRequire rejects http import.meta.url, and browser-environment
// consumers of this module never reach the password seam.
const load = () => argon2 ??=
	createRequire(new URL('../../ajo-kit-auth/package.json', import.meta.url))('argon2') as Argon2

const options = () => ({
	type: load().argon2id,
	memoryCost: 19456,
	timeCost: 2,
	parallelism: 1,
})

const bytes = (data: string | Uint8Array) =>
	typeof data === 'string' ? Buffer.from(data) : data

const keyBytes = (value: PublicKeyBytes, name: string): Uint8Array => {
	if (value instanceof Uint8Array) return value
	try { return base64UrlDecode(value) }
	catch { throw new TypeError(`key.${name} must be canonical unpadded base64url`) }
}

const shape = (key: PublicKey, properties: string[]) => {
	if (!key || typeof key !== 'object' || Array.isArray(key)) {
		throw new TypeError('public key must be a plain key object')
	}
	const held = Reflect.ownKeys(key)
	if (held.length !== properties.length || properties.some(property => !held.includes(property))) {
		throw new TypeError('public key has an unsupported shape')
	}
}

const jwk = (key: PublicKey): JsonWebKey => {
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

const imported = (key: PublicKey) => {
	try { return createPublicKey({ key: jwk(key), format: 'jwk' }) }
	catch { throw new TypeError('public key is invalid') }
}

export const base64UrlDecode: Platform['base64UrlDecode'] = data => {
	if (!canonical.test(data) || data.length % 4 === 1) throw new SyntaxError('Invalid base64url')

	const decoded = Buffer.from(data, 'base64url')
	if (decoded.toString('base64url') !== data) throw new SyntaxError('Invalid base64url')

	// A plain Uint8Array, not a Buffer: the contract is host-neutral and the
	// ajo face can only ever return Uint8Array.
	return Uint8Array.from(decoded)
}

export const base64UrlEncode: Platform['base64UrlEncode'] = data =>
	Buffer.from(bytes(data)).toString('base64url')

export const env: Platform['env'] = name =>
	typeof process === 'undefined' ? undefined : process.env[name]

export const argon2Hash: Platform['argon2Hash'] = plain =>
	load().hash(plain, options())

export const argon2Verify: Platform['argon2Verify'] = (phc, plain) =>
	load().verify(phc, plain)

export const hmacSha256Hex: Platform['hmacSha256Hex'] = (key, data) =>
	createHmac('sha256', key).update(data).digest('hex')

export const randomBase64Url: Platform['randomBase64Url'] = count =>
	randomBytes(count).toString('base64url')

export const randomUUID: Platform['randomUUID'] = uuid

export const sha256Hex: Platform['sha256Hex'] = data =>
	createHash('sha256').update(data).digest('hex')

export const timingSafeEqual: Platform['timingSafeEqual'] = (left, right) =>
	left.byteLength === right.byteLength && equal(left, right)

export const utf8ByteLength: Platform['utf8ByteLength'] = data =>
	Buffer.byteLength(data)

export const validatePublicKey: Platform['validatePublicKey'] = key => {
	imported(key)
	return true
}

export const verifySignature: Platform['verifySignature'] = (key, data, signature) => {
	const publicKey = imported(key)
	try {
		if (key.kty === 'OKP') return verify(null, data, publicKey, signature)
		return verify('sha256', data, { key: publicKey, dsaEncoding: 'der' }, signature)
	} catch {
		return false
	}
}
