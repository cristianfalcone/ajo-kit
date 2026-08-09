// Passkeys: the two WebAuthn ceremonies, their one-shot challenges, and the
// credential records they produce. The wire formats live in webauthn.ts; this
// file owns policy and storage.
//
// It replaces exactly one step of the password flow — proving the person is
// who they claim — and nothing else. A ceremony that verifies ends where
// `password.verify` ends, and the caller goes on to `session.create` and
// `cookie.write` as it always did.

import { strictUtf8Decode } from 'ajo-kit/bytes'
import {
	base64UrlDecode,
	base64UrlEncode,
	randomBase64Url,
	sha256Hex,
	type PublicKey as Key,
} from 'ajo-kit/platform'
import { db } from './store'
import {
	algorithms,
	authenticator,
	client as parse,
	decode,
	identifier,
	publicKey,
	same,
	signature,
	Malformed,
} from './webauthn'

/** How long a challenge stays answerable. */
export const window = 5 * 60 * 1000

/**
 * Where the relying party lives. Both are explicit configuration and neither
 * may ever be derived from a request header: the browser puts the real address
 * bar origin into client data, so deriving the expected value from `Host` or
 * `X-Forwarded-*` would let the caller choose what it is compared against.
 *
 * `rpId` is a bare domain — no scheme, no port. Credentials are bound to it
 * for life and there is no migration path, so a host reached through an SSH
 * tunnel today (`localhost`) and a real name tomorrow are two different
 * relying parties, and the passkeys registered against the first will not be
 * offered to the second. Register the durable name from the start where one
 * exists, and treat tunnel credentials as disposable where it does not.
 */
export type Party = { rpId: string; origins: string[]; name?: string }

let party: Party | undefined

/** Declares the relying party. Required before any ceremony. */
export const configure = (value: Party) => { party = value }

const relying = (): Party => {
	if (!party) throw new Error('ajo-kit-auth: passkey.configure() was never called')
	return party
}

const stamp = (at: number) => new Date(at).toISOString()

const digest = (plain: string) => sha256Hex(plain)

const bytes = (value: unknown, what: string) => {
	// The ceremony types are erased at runtime: what arrives is whatever the
	// request body parsed into, so a field that is not a string has to be
	// refused here rather than reaching a decoder or a query parameter.
	if (typeof value !== 'string') throw new Malformed(`${what} is not a string`)
	try { return base64UrlDecode(value) }
	catch { throw new Malformed(`${what} is not base64url`) }
}

const storedKey = (value: string): Key => {
	try { return JSON.parse(strictUtf8Decode(base64UrlDecode(value))) as Key }
	catch { throw new Malformed('stored credential public key is malformed') }
}

/**
 * Issues a challenge for either ceremony and records it. Challenges are
 * single-use and expire; `answer` consumes one whether or not the ceremony
 * that follows succeeds.
 */
export const challenge = async (
	kind: 'register' | 'authenticate',
	user?: number,
	handle?: string,
) => {

	const plain = randomBase64Url(32)

	await db().insertInto('challenges').values({
		id: digest(plain),
		kind,
		user: user ?? null,
		handle: handle ?? null,
		expiry: stamp(Date.now() + window),
	}).execute()

	return plain
}

/**
 * Consumes a challenge and returns what it was issued for. The delete is the
 * claim: a second caller presenting the same challenge deletes nothing and is
 * told the challenge is unknown, so a replayed ceremony cannot be answered
 * twice even under concurrent requests.
 *
 * Expiry is enforced here, on the redemption path, rather than left to
 * whoever remembers to call `prune`. A window nobody applies is not a window.
 */
const answer = async (plain: string, kind: 'register' | 'authenticate') => {

	const now = stamp(Date.now())
	const id = digest(plain)

	const issued = await db()
		.selectFrom('challenges')
		.select(['user', 'handle'])
		.where('id', '=', id)
		.where('kind', '=', kind)
		.where('expiry', '>', now)
		.executeTakeFirst()

	const claimed = await db()
		.deleteFrom('challenges')
		.where('id', '=', id)
		.where('kind', '=', kind)
		.where('expiry', '>', now)
		.executeTakeFirst()

	// The delete decides, not the read: two callers racing the same challenge
	// both see the row, and only one of them removes it.
	if (!issued || claimed.numDeletedRows !== 1n) throw new Malformed('challenge is unknown, expired or already used')

	return issued
}

/** Deletes expired challenges. */
export const prune = () =>
	db().deleteFrom('challenges').where('expiry', '<', stamp(Date.now())).execute()

/** What the browser must be handed to start a registration ceremony. */
export const registration = async (user: { id: number; name: string; label?: string }) => {

	const { rpId, name } = relying()

	// The user handle is opaque by specification: it travels to the
	// authenticator and back, and putting an email in it would publish one.
	// It rides the challenge to the second half of the ceremony, because the
	// authenticator keeps exactly this value and a freshly generated one
	// would not match what it later returns.
	const handle = await identity(user.id)
	const plain = await challenge('register', user.id, handle)

	return {
		challenge: plain,
		rp: { id: rpId, name: name ?? rpId },
		user: { id: handle, name: user.name, displayName: user.label ?? user.name },
		pubKeyCredParams: algorithms.map(alg => ({ type: 'public-key', alg })),
		authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
		attestation: 'none',
		timeout: window,
		excludeCredentials: await credentials(user.id),
	}
}

/** What the browser must be handed to start an authentication ceremony. */
export const authentication = async () => {

	const { rpId } = relying()

	return {
		challenge: await challenge('authenticate'),
		rpId,
		// Empty by design: a discoverable credential identifies its own
		// account, so the server never has to be told who is logging in
		// before it knows.
		allowCredentials: [],
		userVerification: 'preferred',
		timeout: window,
	}
}

/** The stable opaque handle an authenticator stores for a user. */
const identity = async (user: number) => {
	const row = await db()
		.selectFrom('credentials')
		.select('handle')
		.where('user', '=', user)
		.executeTakeFirst()

	return row?.handle ?? randomBase64Url(32)
}

const credentials = async (user: number) => {
	const rows = await db()
		.selectFrom('credentials')
		.select(['id', 'transports'])
		.where('user', '=', user)
		.execute()

	return rows.map(row => ({
		type: 'public-key' as const,
		id: row.id,
		...(row.transports && { transports: JSON.parse(row.transports) as string[] }),
	}))
}

/** What the browser sends back from `navigator.credentials.create()`. */
export type Attestation = {
	id: string
	clientDataJSON: string
	attestationObject: string
	transports?: string[]
}

/** What the browser sends back from `navigator.credentials.get()`. */
export type Assertion = {
	id: string
	clientDataJSON: string
	authenticatorData: string
	signature: string
	userHandle?: string
}

/**
 * Checks what client data must say. The challenge is not among these: it is
 * proven by `answer`, which finds the row keyed by the hash of the value the
 * client sent and removes it. A comparison here would be against the same
 * field it came from — the freshness is the lookup, not an equality test.
 */
const agrees = (data: ReturnType<typeof parse>, type: string) => {

	const { origins } = relying()

	if (data.type !== type) throw new Malformed('client data is for another ceremony')
	// Compared against configuration, never against a header, and exactly:
	// origin carries scheme and port, and a prefix match would accept
	// `https://host.evil` for `https://host`.
	if (!origins.includes(data.origin)) throw new Malformed('client data comes from an unexpected origin')
	if (data.crossOrigin) throw new Malformed('client data comes from a framed ceremony')
}

/**
 * Verifies a registration ceremony and stores the credential. Returns the
 * credential id; the caller owns what happens next.
 *
 * The attestation statement is not examined: registration asks for `none`,
 * which every mainstream passkey provider gives, and a statement that is not
 * verified must not be treated as if it were.
 */
export const register = async (user: number, response: Attestation) => {

	const { rpId } = relying()
	const raw = bytes(response.clientDataJSON, 'client data')
	const data = parse(raw)

	const issued = await answer(data.challenge, 'register')

	// The challenge was issued for somebody. Registering the credential
	// against anybody else would let a caller who can name a user id attach
	// their own authenticator to that account.
	if (issued.user !== null && issued.user !== user) {
		throw new Malformed('challenge was issued for another account')
	}

	agrees(data, 'webauthn.create')

	const attestation = decode(bytes(response.attestationObject, 'attestation object'))
	if (!(attestation instanceof Map)) throw new Malformed('attestation object is malformed')

	// Registration asks for `none` and nothing here verifies a statement, so
	// anything else must be refused rather than quietly treated as if it were
	// none — an unverified statement is not the absence of one.
	if (attestation.get('fmt') !== 'none') throw new Malformed('attestation format is not accepted')

	const authData = attestation.get('authData')
	if (!(authData instanceof Uint8Array)) throw new Malformed('attestation object carries no authenticator data')

	const parsed = authenticator(authData)

	if (!same(parsed.rpIdHash, identifier(rpId))) throw new Malformed('credential is for another relying party')
	if (!parsed.present) throw new Malformed('the person was not present')
	if (!parsed.credential) throw new Malformed('registration produced no credential')

	// Proves the key parses and the algorithm was one we offered, before a row
	// exists that promises a key nothing can verify against.
	const key = publicKey(parsed.credential.key)

	const id = base64UrlEncode(parsed.credential.id)

	if (id !== response.id) throw new Malformed('credential id does not match its attestation')

	// A credential id already claimed belongs to whoever claimed it. Letting a
	// second account register it would let one account answer for another.
	const taken = await db().selectFrom('credentials').select('id').where('id', '=', id).executeTakeFirst()
	if (taken) throw new Malformed('credential is already registered')

	await db().insertInto('credentials').values({
		id,
		user,
		// The handle the authenticator was given, not a new one: it is what
		// the credential will present when it names its own account.
		handle: issued.handle ?? await identity(user),
		key: base64UrlEncode(JSON.stringify(key.key)),
		alg: key.alg,
		counter: parsed.counter,
		transports: response.transports ? JSON.stringify(response.transports) : null,
		verified: parsed.verified ? stamp(Date.now()) : null,
		eligible: parsed.eligible ? 1 : 0,
		backed: parsed.backed ? 1 : 0,
		last: null,
	}).execute()

	return id
}

/**
 * Verifies an authentication ceremony and returns the user it belongs to.
 * Every failure is the same failure to the caller: which check refused is
 * information about credentials that exist.
 */
export const authenticate = async (response: Assertion): Promise<number> => {

	const { rpId } = relying()
	const raw = bytes(response.clientDataJSON, 'client data')
	const data = parse(raw)

	await answer(data.challenge, 'authenticate')
	agrees(data, 'webauthn.get')

	if (typeof response.id !== 'string') throw new Malformed('assertion names no credential')

	const stored = await db()
		.selectFrom('credentials')
		.select(['id', 'user', 'handle', 'key', 'alg', 'counter', 'eligible', 'verified'])
		.where('id', '=', response.id)
		.executeTakeFirst()

	if (!stored) throw new Malformed('credential is unknown')

	// The ceremony offers no credential list, so the credential must name its
	// own account — and that name must be the one it was registered under.
	// Required, not merely checked when present: a caller that omits it would
	// otherwise skip the check by leaving the field out.
	if (response.userHandle !== stored.handle) {
		throw new Malformed('credential does not belong to that account')
	}

	const authData = bytes(response.authenticatorData, 'authenticator data')
	const parsed = authenticator(authData)

	if (!same(parsed.rpIdHash, identifier(rpId))) throw new Malformed('assertion is for another relying party')
	if (!parsed.present) throw new Malformed('the person was not present')

	// Backup eligibility is fixed for a credential's life, so a change in
	// either direction means this is not the credential that was registered.
	// The alarming direction is the one that gains it: a key registered as
	// device-bound now claiming it can be synced says the private material
	// left the device it was supposed to stay on.
	if ((stored.eligible === 1) !== parsed.eligible) {
		throw new Malformed('credential changed its backup eligibility')
	}

	// A credential enrolled with the person verified may not later be used on
	// presence alone: that is a stolen unlocked phone being enough.
	if (stored.verified && !parsed.verified) {
		throw new Malformed('credential was registered with user verification')
	}

	const key = { alg: stored.alg, key: storedKey(stored.key) }

	if (!signature(key, authData, raw, bytes(response.signature, 'signature'))) {
		throw new Malformed('signature does not verify')
	}

	// The counter is recorded, not enforced: synced passkeys report zero from
	// every device by design, so a regression is a signal for whoever reads
	// the row, never a reason to refuse the person in front of us.
	await db().updateTable('credentials').set({
		counter: parsed.counter,
		backed: parsed.backed ? 1 : 0,
		verified: parsed.verified ? stamp(Date.now()) : stored.verified,
		last: stamp(Date.now()),
	}).where('id', '=', stored.id).execute()

	return stored.user
}

/** Lists a user's credentials for a management screen. */
export const list = (user: number) =>
	db().selectFrom('credentials')
		.select(['id', 'transports', 'created', 'last', 'backed'])
		.where('user', '=', user)
		.execute()

/** Removes one credential from one user. */
export const remove = (user: number, id: string) =>
	db().deleteFrom('credentials').where('user', '=', user).where('id', '=', id).execute()

export { Malformed }
