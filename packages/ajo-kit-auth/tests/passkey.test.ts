// Passkeys, exercised against ceremonies that really are signed. The fixture
// below is an authenticator: it holds a keypair, builds authenticator data at
// the byte offsets the specification fixes, and signs what a real one signs.
// A test that fed hand-written bytes to the verifier could only prove the
// verifier agrees with the test's idea of the format — this proves it agrees
// with the format.

import { createHash, createSign, generateKeyPairSync, randomBytes, sign } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { close, connect, db } from 'ajo-kit/database'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import * as passkey from '../src/passkey'
import { configure } from '../src/store'
import { up } from '../migrations/0002_passkeys'
import { up as initial } from '../migrations/0001_initial'
import { up as teams } from '../migrations/0003_teams'
import { up as invites } from '../migrations/0004_invites'
import { up as integrity } from '../migrations/0005_integrity'
import { ES256, EdDSA, RS256 } from '../src/webauthn'

const rpId = 'localhost'
const origin = 'http://localhost:8080'

const url = (value: Buffer | Uint8Array) => Buffer.from(value).toString('base64url')

// CBOR encoding, only what an attestation object needs: a three-entry map of
// text keys holding a text string, a byte string and an empty map.
const cbor = {
	text: (value: string) => {
		const bytes = Buffer.from(value, 'utf8')
		return Buffer.concat([header(3, bytes.length), bytes])
	},
	bytes: (value: Uint8Array) => Buffer.concat([header(2, value.length), Buffer.from(value)]),
	map: (entries: [string, Buffer][]) =>
		Buffer.concat([header(5, entries.length), ...entries.flatMap(([k, v]) => [cbor.text(k), v])]),
	empty: () => header(5, 0),
	int: (value: number) => value >= 0 ? header(0, value) : header(1, -1 - value),
	keys: (entries: [number, Buffer][]) =>
		Buffer.concat([header(5, entries.length), ...entries.flatMap(([k, v]) => [cbor.int(k), v])]),
}

function header(major: number, length: number) {
	if (length < 24) return Buffer.from([(major << 5) | length])
	if (length < 256) return Buffer.from([(major << 5) | 24, length])
	const buffer = Buffer.alloc(3)
	buffer.writeUInt8((major << 5) | 25, 0)
	buffer.writeUInt16BE(length, 1)
	return buffer
}

type Signer = {
	id: Buffer
	cose: Buffer
	sign: (data: Buffer) => Buffer
}

/** An ES256 authenticator: P-256 keypair, COSE key, DER signatures. */
const p256 = (): Signer => {
	const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
	const jwk = publicKey.export({ format: 'jwk' }) as { x: string; y: string }
	return {
		id: randomBytes(32),
		cose: cbor.keys([
			[1, cbor.int(2)],
			[3, cbor.int(ES256)],
			[-1, cbor.int(1)],
			[-2, cbor.bytes(Buffer.from(jwk.x, 'base64url'))],
			[-3, cbor.bytes(Buffer.from(jwk.y, 'base64url'))],
		]),
		sign: data => createSign('sha256').update(data).sign(privateKey),
	}
}

/** An Ed25519 authenticator: raw 64-byte signatures, no hash argument. */
const ed25519 = (): Signer => {
	const { privateKey, publicKey } = generateKeyPairSync('ed25519')
	const jwk = publicKey.export({ format: 'jwk' }) as { x: string }
	return {
		id: randomBytes(32),
		cose: cbor.keys([
			[1, cbor.int(1)],
			[3, cbor.int(EdDSA)],
			[-1, cbor.int(6)],
			[-2, cbor.bytes(Buffer.from(jwk.x, 'base64url'))],
		]),
		sign: data => sign(null, data, privateKey),
	}
}

/** An RS256 authenticator: a 2048-bit modulus and PKCS#1 SHA-256 signature. */
const rs256 = (): Signer => {
	const { privateKey, publicKey } = generateKeyPairSync('rsa', {
		modulusLength: 2048,
		publicExponent: 0x10001,
	})
	const jwk = publicKey.export({ format: 'jwk' }) as { n: string; e: string }
	return {
		id: randomBytes(32),
		cose: cbor.keys([
			[1, cbor.int(3)],
			[3, cbor.int(RS256)],
			[-1, cbor.bytes(Buffer.from(jwk.n, 'base64url'))],
			[-2, cbor.bytes(Buffer.from(jwk.e, 'base64url'))],
		]),
		sign: data => createSign('sha256').update(data).sign(privateKey),
	}
}

const flags = { present: 0x01, verified: 0x04, eligible: 0x08, backed: 0x10, attested: 0x40 }

const authData = (options: { rp?: string; flags: number; counter?: number; signer?: Signer }) => {
	const head = Buffer.alloc(37)
	createHash('sha256').update(options.rp ?? rpId).digest().copy(head, 0)
	head.writeUInt8(options.flags, 32)
	head.writeUInt32BE(options.counter ?? 0, 33)

	if (!options.signer) return head

	const attested = Buffer.alloc(18)
	options.signer.id.length > 0xffff && expect.fail('credential id too long')
	attested.writeUInt16BE(options.signer.id.length, 16)

	return Buffer.concat([head, attested, options.signer.id, options.signer.cose])
}

const clientData = (type: string, challenge: string, from = origin) =>
	Buffer.from(JSON.stringify({ type, challenge, origin: from, crossOrigin: false }), 'utf8')

const attestation = (signer: Signer, challenge: string, options: { flags?: number; rp?: string } = {}) => {
	const client = clientData('webauthn.create', challenge)
	const data = authData({
		flags: options.flags ?? (flags.present | flags.verified | flags.attested | flags.eligible | flags.backed),
		rp: options.rp,
		signer,
	})
	return {
		id: url(signer.id),
		clientDataJSON: url(client),
		attestationObject: url(cbor.map([
			['fmt', cbor.text('none')],
			['attStmt', cbor.empty()],
			['authData', cbor.bytes(data)],
		])),
		transports: ['internal', 'hybrid'],
	}
}

const assertion = (signer: Signer, challenge: string, options: { flags?: number; rp?: string; counter?: number; from?: string; handle?: string } = {}) => {
	const client = clientData('webauthn.get', challenge, options.from)
	const data = authData({
		flags: options.flags ?? (flags.present | flags.verified | flags.eligible | flags.backed),
		rp: options.rp,
		counter: options.counter,
	})
	const signed = Buffer.concat([data, createHash('sha256').update(client).digest()])
	return {
		id: url(signer.id),
		clientDataJSON: url(client),
		authenticatorData: url(data),
		signature: url(signer.sign(signed)),
		// A discoverable ceremony always returns the handle the authenticator
		// was given at registration; omitting it here would test a browser
		// that does not exist.
		userHandle: options.handle ?? handles.get(url(signer.id)),
	}
}

/** What each authenticator was told to remember, as a real one would. */
const handles = new Map<string, string>()

let directory: string

// The real migrations against a real SQLite file: the schema under test is
// the one a host would run, not a fixture's idea of it.
beforeEach(async () => {
	directory = mkdtempSync(join(tmpdir(), 'ajo-kit-auth-passkey-'))
	connect(join(directory, 'test.sqlite'))
	configure(() => db())

	await initial(db<any>())
	await up(db<any>())
	await teams(db<any>())
	await invites(db<any>())
	await integrity(db<any>())
	await db<any>().insertInto('users').values({ id: 1, email: 'owner@example.test' }).execute()
	await db<any>().insertInto('users').values({ id: 2, email: 'other@example.test' }).execute()

	passkey.configure({ rpId, origins: [origin] })
})

afterEach(async () => {
	await close()
	rmSync(directory, { recursive: true, force: true })
})

/**
 * The whole registration as a caller performs it: ask for options, let the
 * authenticator keep the handle they carry, then hand back the attestation.
 * Skipping `registration()` here would skip the handle round trip, which is
 * exactly where a mismatch hides until the first login fails.
 */
const enroll = async (signer: Signer, user = 1) => {
	const options = await passkey.registration({ id: user, name: `user-${user}@example.test` })
	handles.set(url(signer.id), options.user.id)
	return passkey.register(user, attestation(signer, options.challenge))
}

const registrationChallenge = async (user: number) =>
	(await passkey.registration({ id: user, name: `user-${user}@example.test` })).challenge

const authenticationChallenge = async () => (await passkey.authentication()).challenge

describe('the registration ceremony', () => {
	test('an ES256 credential registers and then authenticates', async () => {
		const signer = p256()
		const id = await enroll(signer)

		expect(id).toBe(url(signer.id))

		const challenge = await authenticationChallenge()
		await expect(passkey.authenticate(assertion(signer, challenge))).resolves.toBe(1)
	})

	test('an Ed25519 credential registers and then authenticates', async () => {
		const signer = ed25519()
		await enroll(signer)

		const challenge = await authenticationChallenge()
		await expect(passkey.authenticate(assertion(signer, challenge))).resolves.toBe(1)
	})

	test('an RS256 credential registers and then authenticates', async () => {
		const signer = rs256()
		await enroll(signer)

		const challenge = await authenticationChallenge()
		await expect(passkey.authenticate(assertion(signer, challenge))).resolves.toBe(1)
	})

	test('stores a host-neutral JSON public-key description', async () => {
		const signer = p256()
		await enroll(signer)

		const row = await db<any>().selectFrom('credentials').select('key').executeTakeFirstOrThrow()
		const key = JSON.parse(Buffer.from(row.key, 'base64url').toString('utf8'))
		expect(key).toEqual({
			kty: 'EC',
			crv: 'P-256',
			x: expect.any(String),
			y: expect.any(String),
		})
	})

	test('registration refuses a ceremony for another relying party', async () => {
		const signer = p256()
		const challenge = await registrationChallenge(1)

		await expect(passkey.register(1, attestation(signer, challenge, { rp: 'evil.test' })))
			.rejects.toThrow(/another relying party/)
	})

	test('registration refuses a ceremony nobody was present for', async () => {
		const signer = p256()
		const challenge = await registrationChallenge(1)

		await expect(passkey.register(1, attestation(signer, challenge, { flags: flags.attested })))
			.rejects.toThrow(/not present/)
	})

	// Letting a second account claim a credential id would let one account
	// answer for another.
	test('a credential id already registered cannot be claimed again', async () => {
		const signer = p256()
		await enroll(signer)

		const challenge = await registrationChallenge(2)
		await expect(passkey.register(2, attestation(signer, challenge)))
			.rejects.toThrow(/already registered/)
	})

	// The bug this test exists for shipped invisible: enrolling through a
	// shortcut that skipped `registration()` meant the handle never made the
	// round trip, and the first login of every account would have failed.
	test('the handle the authenticator kept is the handle the credential is stored with', async () => {
		const signer = p256()
		const options = await passkey.registration({ id: 1, name: 'owner@example.test' })

		await passkey.register(1, attestation(signer, options.challenge))

		const challenge = await authenticationChallenge()
		await expect(passkey.authenticate(assertion(signer, challenge, { handle: options.user.id })))
			.resolves.toBe(1)
	})

	// The credential attaches to whoever the challenge was issued for, so a
	// caller that can name a user id cannot attach its own authenticator to
	// another account.
	test('a challenge issued for one account cannot register a credential on another', async () => {
		const signer = p256()
		const challenge = await registrationChallenge(2)

		await expect(passkey.register(1, attestation(signer, challenge)))
			.rejects.toThrow(/issued for another account/)
	})

	// Real hardware keys emit extension outputs after the credential key when
	// a discoverable credential is asked for; reading the key as "the rest of
	// the buffer" made those keys unregistrable.
	test('an authenticator that emits extension outputs can still register', async () => {
		const signer = p256()
		const options = await passkey.registration({ id: 1, name: 'owner@example.test' })
		handles.set(url(signer.id), options.user.id)

		const client = clientData('webauthn.create', options.challenge)
		const base = authData({
			flags: flags.present | flags.verified | flags.attested | flags.eligible | flags.backed | 0x80,
			signer,
		})
		const extended = Buffer.concat([base, cbor.map([['credProtect', cbor.int(2)]])])

		await expect(passkey.register(1, {
			id: url(signer.id),
			clientDataJSON: url(client),
			attestationObject: url(cbor.map([
				['fmt', cbor.text('none')],
				['attStmt', cbor.empty()],
				['authData', cbor.bytes(extended)],
			])),
		})).resolves.toBe(url(signer.id))
	})

	// An unverified statement is not the absence of one.
	test('an attestation format other than none is refused', async () => {
		const signer = p256()
		const options = await passkey.registration({ id: 1, name: 'owner@example.test' })
		const client = clientData('webauthn.create', options.challenge)

		await expect(passkey.register(1, {
			id: url(signer.id),
			clientDataJSON: url(client),
			attestationObject: url(cbor.map([
				['fmt', cbor.text('packed')],
				['attStmt', cbor.empty()],
				['authData', cbor.bytes(authData({
					flags: flags.present | flags.attested,
					signer,
				}))],
			])),
		})).rejects.toThrow(/format is not accepted/)
	})
})

describe('the authentication ceremony', () => {
	test('a signature over other bytes does not verify', async () => {
		const signer = p256()
		await enroll(signer)

		const challenge = await authenticationChallenge()
		const response = assertion(signer, challenge)
		// The same ceremony with one field rewritten after signing: every
		// other check still passes, so only the signature can catch it.
		const tampered = {
			...response,
			authenticatorData: url(authData({
				flags: flags.present | flags.verified | flags.eligible | flags.backed,
				counter: 99,
			})),
		}

		await expect(passkey.authenticate(tampered)).rejects.toThrow(/does not verify/)
	})

	test('another key cannot answer for a registered credential', async () => {
		const signer = p256()
		await enroll(signer)

		const impostor = p256()
		const challenge = await authenticationChallenge()
		// The impostor signs a well-formed ceremony — with the wrong key, and
		// wearing the real credential's id and handle, so every check but the
		// signature passes.
		const response = {
			...assertion(impostor, challenge, { handle: handles.get(url(signer.id)) }),
			id: url(signer.id),
		}

		await expect(passkey.authenticate(response)).rejects.toThrow(/does not verify/)
	})

	test('an assertion from an unexpected origin is refused', async () => {
		const signer = p256()
		await enroll(signer)

		const challenge = await authenticationChallenge()
		await expect(passkey.authenticate(assertion(signer, challenge, { from: 'http://localhost:9999' })))
			.rejects.toThrow(/unexpected origin/)
	})

	test('an assertion for another relying party is refused', async () => {
		const signer = p256()
		await enroll(signer)

		const challenge = await authenticationChallenge()
		await expect(passkey.authenticate(assertion(signer, challenge, { rp: 'evil.test' })))
			.rejects.toThrow(/another relying party/)
	})

	test('a user handle naming another account is refused', async () => {
		const signer = p256()
		await enroll(signer)

		const challenge = await authenticationChallenge()
		await expect(passkey.authenticate(assertion(signer, challenge, { handle: 'somebody-else' })))
			.rejects.toThrow(/does not belong/)
	})

	test('an unknown credential is refused', async () => {
		const challenge = await authenticationChallenge()
		await expect(passkey.authenticate(assertion(p256(), challenge))).rejects.toThrow(/unknown/)
	})
})

describe('challenges', () => {
	test('the low-level challenge issuer is not public', () => {
		expect('challenge' in passkey).toBe(false)
	})

	test('a challenge answers exactly once', async () => {
		const signer = p256()
		await enroll(signer)

		const challenge = await authenticationChallenge()
		const response = assertion(signer, challenge)

		await expect(passkey.authenticate(response)).resolves.toBe(1)
		// The same ceremony, replayed byte for byte.
		await expect(passkey.authenticate(response)).rejects.toThrow(/already used/)
	})

	test('a challenge issued for one ceremony cannot answer the other', async () => {
		const signer = p256()
		const challenge = await registrationChallenge(1)

		await expect(passkey.authenticate(assertion(signer, challenge)))
			.rejects.toThrow(/unknown, expired or already used/)
	})

	test('a challenge nobody issued is refused', async () => {
		const signer = p256()
		await enroll(signer)

		await expect(passkey.authenticate(assertion(signer, randomBytes(32).toString('base64url'))))
			.rejects.toThrow(/unknown, expired or already used/)
	})

	// The window has to be enforced where the challenge is redeemed. Left to
	// whoever remembers to call prune, a captured ceremony stays answerable
	// for as long as nobody sweeps — which is to say, indefinitely.
	test('an expired challenge is refused even when nothing has pruned it', async () => {
		const signer = p256()
		await enroll(signer)

		const challenge = await authenticationChallenge()
		const response = assertion(signer, challenge)

		await db<any>().updateTable('challenges')
			.set({ expiry: new Date(Date.now() - 60_000).toISOString() })
			.execute()

		await expect(passkey.authenticate(response)).rejects.toThrow(/expired/)
	})

	test('prune removes what has expired and leaves what is live', async () => {
		const signer = p256()
		await enroll(signer)

		const stale = await authenticationChallenge()
		await db<any>().updateTable('challenges')
			.set({ expiry: new Date(Date.now() - 60_000).toISOString() })
			.execute()

		const live = await authenticationChallenge()
		await passkey.prune()

		expect(await db<any>().selectFrom('challenges').selectAll().execute()).toHaveLength(1)
		await expect(passkey.authenticate(assertion(signer, stale))).rejects.toThrow()
		await expect(passkey.authenticate(assertion(signer, live))).resolves.toBe(1)
	})
})

describe('what a credential may not become', () => {
	// RSA verification is only as good as the exponent: with e = 1 the
	// operation is an identity and every signature over every message
	// verifies against a key nobody holds the private half of.
	test('an RSA key with a forged exponent cannot be registered', async () => {
		const options = await passkey.registration({ id: 1, name: 'owner@example.test' })
		const id = randomBytes(32)
		const cose = cbor.keys([
			[1, cbor.int(3)],
			[3, cbor.int(-257)],
			[-1, cbor.bytes(randomBytes(256))],
			[-2, cbor.bytes(Buffer.from([0x01]))],
		])
		const signer = { id, cose, sign: () => Buffer.alloc(0) }

		await expect(passkey.register(1, attestation(signer, options.challenge)))
			.rejects.toThrow(/standard exponent/)
	})

	test('an RSA key with a small modulus cannot be registered', async () => {
		const options = await passkey.registration({ id: 1, name: 'owner@example.test' })
		const signer = {
			id: randomBytes(32),
			cose: cbor.keys([
				[1, cbor.int(3)],
				[3, cbor.int(-257)],
				[-1, cbor.bytes(randomBytes(64))],
				[-2, cbor.bytes(Buffer.from([0x01, 0x00, 0x01]))],
			]),
			sign: () => Buffer.alloc(0),
		}

		await expect(passkey.register(1, attestation(signer, options.challenge)))
			.rejects.toThrow(/modulus is too small/)
	})

	// A point that is not on the curve is refused as malformed input, not as
	// a crash: these bytes come from whoever is registering.
	test('a P-256 key whose point is not on the curve is refused, not thrown at', async () => {
		const options = await passkey.registration({ id: 1, name: 'owner@example.test' })
		const signer = {
			id: randomBytes(32),
			cose: cbor.keys([
				[1, cbor.int(2)],
				[3, cbor.int(-7)],
				[-1, cbor.int(1)],
				[-2, cbor.bytes(randomBytes(32))],
				[-3, cbor.bytes(randomBytes(32))],
			]),
			sign: () => Buffer.alloc(0),
		}

		await expect(passkey.register(1, attestation(signer, options.challenge)))
			.rejects.toThrow(/usable public key/)
	})

	test('client data containing invalid UTF-8 is refused', async () => {
		await expect(passkey.register(1, {
			id: 'credential',
			clientDataJSON: url(Buffer.from([0xed, 0xa0, 0x80])),
			attestationObject: '',
		})).rejects.toThrow(/not valid JSON/)
	})

	// Backup eligibility is fixed for a credential's life. Gaining it means
	// the private material left the device it was bound to.
	test('a device-bound credential that claims it can sync is refused', async () => {
		const signer = p256()
		const options = await passkey.registration({ id: 1, name: 'owner@example.test' })
		handles.set(url(signer.id), options.user.id)

		// Enrolled without BE.
		await passkey.register(1, {
			...attestation(signer, options.challenge, { flags: flags.present | flags.verified | flags.attested }),
		})

		const challenge = await authenticationChallenge()
		await expect(passkey.authenticate(assertion(signer, challenge, {
			flags: flags.present | flags.verified | flags.eligible | flags.backed,
		}))).rejects.toThrow(/backup eligibility/)
	})

	test('a credential registered with the person verified cannot fall back to presence alone', async () => {
		const signer = p256()
		await enroll(signer)

		const challenge = await authenticationChallenge()
		await expect(passkey.authenticate(assertion(signer, challenge, {
			flags: flags.present | flags.eligible | flags.backed,
		}))).rejects.toThrow(/user verification/)
	})

	test('deeply nested input is refused as malformed, never as a crash', async () => {
		const bomb = url(Buffer.alloc(5000, 0x81))
		const options = await passkey.registration({ id: 1, name: 'owner@example.test' })

		await expect(passkey.register(1, {
			id: 'x',
			clientDataJSON: url(clientData('webauthn.create', options.challenge)),
			attestationObject: bomb,
		})).rejects.toThrow(/nests too deeply|malformed|cbor/)
	})

	test('a field that is not a string is refused as malformed', async () => {
		await expect(passkey.authenticate({ clientDataJSON: 4096 } as never))
			.rejects.toThrow(/not a string/)
	})
})

describe('what the ceremonies record', () => {
	test('the counter and backup state follow the authenticator', async () => {
		const signer = p256()
		await enroll(signer)

		const challenge = await authenticationChallenge()
		await passkey.authenticate(assertion(signer, challenge, { counter: 42 }))

		const [row] = await passkey.list(1)
		expect(row.backed).toBe(1)
		expect(row.last).toBeTruthy()
	})

	// Synced passkeys report zero from every device by design: a counter that
	// goes backwards is a note for whoever reads the row, never a refusal.
	test('a counter that goes backwards does not refuse the person', async () => {
		const signer = p256()
		await enroll(signer)

		const first = await authenticationChallenge()
		await passkey.authenticate(assertion(signer, first, { counter: 10 }))

		const second = await authenticationChallenge()
		await expect(passkey.authenticate(assertion(signer, second, { counter: 1 }))).resolves.toBe(1)
	})

	test('remove takes a credential from its owner and nobody else', async () => {
		const signer = p256()
		await enroll(signer)

		await passkey.remove(2, url(signer.id))
		expect(await passkey.list(1)).toHaveLength(1)

		await passkey.remove(1, url(signer.id))
		expect(await passkey.list(1)).toHaveLength(0)
	})
})

describe('the relying party', () => {
	test('the registration options offer every algorithm and ask for a discoverable credential', async () => {
		const options = await passkey.registration({ id: 1, name: 'owner@example.test' })

		expect(options.rp.id).toBe(rpId)
		expect(options.attestation).toBe('none')
		expect(options.authenticatorSelection.residentKey).toBe('required')
		expect(options.pubKeyCredParams.map(p => p.alg)).toEqual([-8, -7, -257])
		// The handle is opaque: an email here would publish one to every
		// authenticator that stores it.
		expect(options.user.id).not.toContain('@')
	})

	test('the authentication options name no credential, so the passkey names its own account', async () => {
		const options = await passkey.authentication()

		expect(options.rpId).toBe(rpId)
		expect(options.allowCredentials).toEqual([])
	})

	test('registration options exclude what the account already registered', async () => {
		const signer = p256()
		await enroll(signer)

		const options = await passkey.registration({ id: 1, name: 'owner@example.test' })
		expect(options.excludeCredentials.map(c => c.id)).toEqual([url(signer.id)])
	})
})
