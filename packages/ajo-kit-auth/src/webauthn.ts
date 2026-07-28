// The WebAuthn relying-party primitives: CBOR, authenticator data, COSE keys
// and signature verification. Pure functions over bytes — no database, no
// request, no policy. passkey.ts owns the ceremonies and the storage; this
// file owns being right about the wire format.
//
// Written rather than depended upon because the whole job here is attestation
// `none`, which is what every mainstream passkey provider emits: no statement
// to check, no certificate chains, no metadata service. That leaves a CBOR
// subset, fixed-offset parsing, and signatures node:crypto verifies natively.
// The moment real attestation is needed — enterprise policy, TPM formats —
// this is the wrong file and @simplewebauthn/server is the right dependency.

import { createHash, createPublicKey, timingSafeEqual, verify as check } from 'node:crypto'

/** COSE algorithm identifiers this relying party accepts. */
export const ES256 = -7
export const EdDSA = -8
export const RS256 = -257

/**
 * Algorithms offered at registration, best first. RS256 is not optional in
 * practice: Windows Hello over a TPM emits it, and omitting it locks those
 * users out of registering at all.
 */
export const algorithms = [EdDSA, ES256, RS256]

const decoder = new TextDecoder('utf-8', { fatal: true })

class Malformed extends Error {}

/** Fails the ceremony with a reason that never quotes attacker-supplied bytes. */
const fail = (reason: string): never => { throw new Malformed(reason) }

// CBOR, the subset RFC 8949 lets an authenticator use: unsigned and negative
// integers, byte and text strings, arrays, and maps. Indefinite lengths, tags,
// floats and simple values do not appear in attestation objects or COSE keys,
// and accepting them would only widen what this parser can be asked to do.

type Cbor = number | string | Uint8Array | Cbor[] | Map<number | string, Cbor>

type Cursor = { view: DataView; bytes: Uint8Array; at: number }

// Attestation objects nest three deep and COSE keys two. A limit an order of
// magnitude above that costs nothing and keeps a few kilobytes of nested
// openers from exhausting the stack — which would leave this file throwing a
// RangeError nobody catches instead of refusing malformed input.
const depth = 32

const need = (cursor: Cursor, count: number) => {
	if (cursor.at + count > cursor.bytes.length) fail('cbor ended mid-value')
}

const count = (cursor: Cursor, info: number): number => {
	if (info < 24) return info
	need(cursor, 1)
	if (info === 24) return cursor.view.getUint8(cursor.at++)
	need(cursor, 2)
	if (info === 25) { const value = cursor.view.getUint16(cursor.at); cursor.at += 2; return value }
	need(cursor, 4)
	if (info === 26) { const value = cursor.view.getUint32(cursor.at); cursor.at += 4; return value }
	// A 64-bit length in a credential public key is not a real authenticator;
	// it is someone asking this parser to allocate.
	return fail('cbor length is out of range')
}

const value = (cursor: Cursor, level = 0): Cbor => {
	if (level > depth) fail('cbor nests too deeply')

	need(cursor, 1)
	const initial = cursor.view.getUint8(cursor.at++)
	const major = initial >> 5
	const info = initial & 0x1f

	if (major === 0) return count(cursor, info)
	if (major === 1) return -1 - count(cursor, info)

	if (major === 2 || major === 3) {
		const length = count(cursor, info)
		need(cursor, length)
		const slice = cursor.bytes.subarray(cursor.at, cursor.at + length)
		cursor.at += length
		if (major === 2) return slice
		try { return decoder.decode(slice) }
		catch { return fail('cbor text is not valid utf-8') }
	}

	if (major === 4) {
		const length = count(cursor, info)
		const items: Cbor[] = []
		for (let i = 0; i < length; i++) items.push(value(cursor, level + 1))
		return items
	}

	if (major === 5) {
		const length = count(cursor, info)
		const entries = new Map<number | string, Cbor>()
		for (let i = 0; i < length; i++) {
			const key = value(cursor, level + 1)
			if (typeof key !== 'number' && typeof key !== 'string') fail('cbor map key is not a label')
			const held = value(cursor, level + 1)
			// A repeated key is how a parser and a validator are made to
			// disagree about the same document.
			if (entries.has(key as number | string)) fail('cbor map repeats a key')
			entries.set(key as number | string, held)
		}
		return entries
	}

	return fail('cbor holds an unsupported major type')
}

/** Decodes one CBOR item and reports how many bytes it occupied. */
export const read = (bytes: Uint8Array): { item: Cbor; length: number } => {
	const cursor: Cursor = { view: new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), bytes, at: 0 }
	const item = value(cursor)
	return { item, length: cursor.at }
}

/** Decodes one CBOR item, refusing trailing bytes. */
export const decode = (bytes: Uint8Array): Cbor => {
	const { item, length } = read(bytes)
	if (length !== bytes.length) fail('cbor has trailing bytes')
	return item
}

/** The parsed authenticator data every ceremony signs over. */
export type Authenticator = {
	rpIdHash: Uint8Array
	present: boolean
	verified: boolean
	eligible: boolean
	backed: boolean
	counter: number
	credential?: { id: Uint8Array; key: Map<number | string, Cbor> }
}

/**
 * Parses authenticator data, whose layout is fixed: 32 bytes of RP ID hash,
 * one byte of flags, a four-byte counter, then attested credential data when
 * the AT flag says so.
 */
export const authenticator = (bytes: Uint8Array): Authenticator => {
	if (bytes.length < 37) fail('authenticator data is too short')

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
	const flags = view.getUint8(32)
	const eligible = !!(flags & 0x08)
	const backed = !!(flags & 0x10)

	// A credential that cannot be backed up cannot be backed up. The pair is
	// the authenticator's own statement about itself, and an inconsistent one
	// means the bytes were not produced by a conforming authenticator.
	if (!eligible && backed) fail('backup state contradicts backup eligibility')

	const data: Authenticator = {
		rpIdHash: bytes.subarray(0, 32),
		present: !!(flags & 0x01),
		verified: !!(flags & 0x04),
		eligible,
		backed,
		counter: view.getUint32(33),
	}

	if (!(flags & 0x40)) return data

	if (bytes.length < 55) fail('attested credential data is truncated')
	const length = view.getUint16(53)
	// The spec caps credential ids at 1023 bytes; a longer one is a length
	// field being used as an allocation request.
	if (length > 1023) fail('credential id is out of range')
	if (bytes.length < 55 + length) fail('credential id is truncated')

	const id = bytes.subarray(55, 55 + length)

	// The key is followed by extension outputs whenever the ED flag is set,
	// and an authenticator asked for a discoverable credential commonly sets
	// it — credProtect, hmac-secret. Reading the key by its own length rather
	// than as "the rest of the buffer" is what lets a hardware key register at
	// all; the outputs themselves this relying party has no use for.
	const { item: key } = read(bytes.subarray(55 + length))
	if (!(key instanceof Map)) fail('credential public key is not a COSE key')

	data.credential = { id, key: key as Map<number | string, Cbor> }

	return data
}

const bytes = (key: Map<number | string, Cbor>, label: number, size?: number): Uint8Array => {
	const held = key.get(label)
	if (!(held instanceof Uint8Array)) return fail('COSE key holds a malformed coordinate')
	// Fixed-width coordinates are fixed width: a short one base64urls into a
	// different key than the authenticator registered.
	if (size !== undefined && held.length !== size) fail('COSE coordinate has the wrong width')
	return held
}

const url = (value: Uint8Array) => Buffer.from(value).toString('base64url')

/**
 * Converts a COSE public key into a Node key object, refusing any key whose
 * declared algorithm and actual key type disagree — the algorithm alone is
 * attacker-supplied and cannot be the only thing consulted.
 */
export const publicKey = (key: Map<number | string, Cbor>) => {
	const kty = key.get(1)
	const alg = key.get(3)

	if (typeof alg !== 'number') fail('COSE key declares no algorithm')

	// Every import is wrapped: the coordinates are attacker-supplied, and a
	// point off the curve makes Node throw a TypeError that would otherwise
	// escape a ceremony as a crash rather than a refusal.
	const imported = (jwk: Record<string, string>) => {
		try { return createPublicKey({ key: jwk, format: 'jwk' }) }
		catch { return fail('COSE key does not describe a usable public key') }
	}

	if (alg === ES256) {
		if (kty !== 2 || key.get(-1) !== 1) fail('ES256 key is not a P-256 key')
		return {
			alg,
			key: imported({ kty: 'EC', crv: 'P-256', x: url(bytes(key, -2, 32)), y: url(bytes(key, -3, 32)) }),
		}
	}

	if (alg === EdDSA) {
		if (kty !== 1 || key.get(-1) !== 6) fail('EdDSA key is not an Ed25519 key')
		return {
			alg,
			key: imported({ kty: 'OKP', crv: 'Ed25519', x: url(bytes(key, -2, 32)) }),
		}
	}

	if (alg === RS256) {
		if (kty !== 3) fail('RS256 key is not an RSA key')

		const n = bytes(key, -1)
		const e = bytes(key, -2)

		// Neither of these is a formality. An RSA key is only as good as its
		// exponent and modulus, and nothing else in this file would notice a
		// bad one: with e = 1 the verification becomes an identity, and every
		// signature over every message verifies against a key whose private
		// half nobody holds. Real authenticators use 65537 and 2048-bit
		// moduli; a credential offering anything else is not an authenticator
		// making an unusual choice, it is someone registering a skeleton key.
		if (!same(e, new Uint8Array([0x01, 0x00, 0x01]))) fail('RSA key does not use the standard exponent')
		if (n.length < 256) fail('RSA modulus is too small')

		return {
			alg,
			key: imported({ kty: 'RSA', n: url(n), e: url(e) }),
		}
	}

	return fail('COSE key uses an algorithm this relying party does not accept')
}

/**
 * Verifies an assertion signature over `authenticatorData || sha256(clientDataJSON)`.
 *
 * ES256 signatures arrive ASN.1 DER encoded, which is what `node:crypto`
 * expects by default and what WebCrypto's `subtle.verify` does not — the same
 * bytes given to the other API return false rather than throwing, which is the
 * quiet way this gets wrong.
 */
export const signature = (
	stored: { alg: number; key: ReturnType<typeof createPublicKey> },
	data: Uint8Array,
	client: Uint8Array,
	sig: Uint8Array,
): boolean => {
	const signed = Buffer.concat([data, createHash('sha256').update(client).digest()])
	try {
		if (stored.alg === EdDSA) return check(null, signed, stored.key, sig)
		return check('sha256', signed, { key: stored.key, dsaEncoding: 'der' }, sig)
	} catch {
		return false
	}
}

/** Compares two byte strings without leaking where they diverge. */
export const same = (a: Uint8Array, b: Uint8Array) =>
	a.length === b.length && timingSafeEqual(a, b)

/** The SHA-256 of an RP ID, as it appears in authenticator data. */
export const identifier = (rpId: string) => new Uint8Array(createHash('sha256').update(rpId).digest())

/** The client data a ceremony must agree with. */
export type Client = { type: string; challenge: string; origin: string; crossOrigin?: boolean }

/** Parses clientDataJSON, refusing anything that is not the expected object. */
export const client = (bytes: Uint8Array): Client => {
	let parsed: unknown
	try { parsed = JSON.parse(decoder.decode(bytes)) }
	catch { return fail('client data is not valid JSON') }

	const data = parsed as Client

	if (!data || typeof data !== 'object') fail('client data is not an object')
	if (typeof data.type !== 'string') fail('client data declares no type')
	if (typeof data.challenge !== 'string') fail('client data declares no challenge')
	if (typeof data.origin !== 'string') fail('client data declares no origin')

	return data
}

export { Malformed }
