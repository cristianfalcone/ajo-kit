import { strictUtf8Decode } from 'ajo-kit/bytes'
import { base64UrlDecode, base64UrlEncode, hmacSha256Hex, timingSafeEqual } from 'ajo-kit/platform'
import * as secret from './secret'
import { db } from './store'

const hours = 24
const hex = /^[0-9a-f]+$/i
const ascii = (value: string) => Uint8Array.from(value, character => character.charCodeAt(0))
const normalize = (email: string) => email.trim().toLowerCase()

/** Signs a user id and normalized email into a time-limited verification signature. */
export function sign(user: number, email: string): string {

	const expiry = Date.now() + hours * 60 * 60 * 1000
	const data = `${user}:${expiry}:${base64UrlEncode(normalize(email))}`
	const sig = hmacSha256Hex(secret.value(), data)

	return base64UrlEncode(`${data}:${sig}`)
}

/**
 * Verifies the signed email still matches the account and marks it verified.
 * The link remains replayable until expiry, but can only affirm the exact
 * normalized address it was minted for; an already verified account succeeds
 * without another write.
 */
export async function validate(signature: string): Promise<number | null> {

	const key = secret.value()

	try {

		const decoded = strictUtf8Decode(base64UrlDecode(signature))
		const [user, expiry, bound, sig, extra] = decoded.split(':')
		const id = Number(user)
		const deadline = Number(expiry)

		if (extra !== undefined || !Number.isSafeInteger(id) || id < 1) return null
		if (!Number.isFinite(deadline) || Date.now() > deadline) return null

		const data = `${user}:${expiry}:${bound}`
		const expected = hmacSha256Hex(key, data)
		if (!sig || !hex.test(sig)) return null
		const actual = ascii(sig.toLowerCase())
		const wanted = ascii(expected)

		if (!timingSafeEqual(actual, wanted) || !bound) return null

		const email = normalize(strictUtf8Decode(base64UrlDecode(bound)))

		return db().transaction().execute(async trx => {
			const account = await trx
				.selectFrom('users')
				.select(['email', 'verified'])
				.where('id', '=', id)
				.executeTakeFirst()

			if (!account || normalize(account.email) !== email) return null
			if (account.verified !== null) return id

			const changed = await trx
				.updateTable('users')
				.set({ verified: new Date().toISOString() })
				.where('id', '=', id)
				.where('email', '=', account.email)
				.where('verified', 'is', null)
				.returning('id')
				.executeTakeFirst()

			if (changed) return id

			const current = await trx
				.selectFrom('users')
				.select(['email', 'verified'])
				.where('id', '=', id)
				.executeTakeFirst()

			return current && normalize(current.email) === email && current.verified !== null ? id : null
		})

	} catch {
		return null
	}
}

/** Builds an absolute email verification URL bound to the user's email. */
export function url(user: number, email: string, base: string): string {
	return `${base}/verify/${sign(user, email)}`
}
