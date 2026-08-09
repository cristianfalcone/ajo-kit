import { createHash, createHmac, randomBytes, timingSafeEqual as equal } from 'node:crypto'
import { createRequire } from 'node:module'
import type { Platform } from './platform'

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

export const sha256Hex: Platform['sha256Hex'] = data =>
	createHash('sha256').update(data).digest('hex')

export const timingSafeEqual: Platform['timingSafeEqual'] = (left, right) =>
	left.byteLength === right.byteLength && equal(left, right)

export const utf8ByteLength: Platform['utf8ByteLength'] = data =>
	Buffer.byteLength(data)
