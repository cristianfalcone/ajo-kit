import { base64UrlDecode, base64UrlEncode, hmacSha256Hex, timingSafeEqual } from 'ajo-kit/platform'
import * as secret from './secret'
import { db } from 'ajo-kit/database'
import type { Auth } from './types'
import { normalize, stamp } from './format'

const hours = 24
const hex = /^[0-9a-f]+$/i
const utf8 = new TextDecoder('utf-8', { fatal: true })
const ascii = (value: string) => Uint8Array.from(value, character => character.charCodeAt(0))

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

		const decoded = utf8.decode(base64UrlDecode(signature))
		const [user, expiry, bound, sig, extra] = decoded.split(':')

		if (extra !== undefined || !sig || !hex.test(sig)) return null
		if (!timingSafeEqual(ascii(sig.toLowerCase()), ascii(hmacSha256Hex(key, `${user}:${expiry}:${bound}`)))) return null

		const id = Number(user)
		const deadline = Number(expiry)

		if (!Number.isSafeInteger(id) || id < 1) return null
		if (!Number.isFinite(deadline) || Date.now() > deadline) return null

		const email = normalize(utf8.decode(base64UrlDecode(bound!)))

		return db<Auth>().transaction().execute(async trx => {
			const account = await trx
				.selectFrom('users')
				.select(['email', 'verified'])
				.where('id', '=', id)
				.executeTakeFirst()

			if (!account || normalize(account.email) !== email) return null
			if (account.verified !== null) return id

			const changed = await trx
				.updateTable('users')
				.set({ verified: stamp() })
				.where('id', '=', id)
				.where('email', '=', account.email)
				.where('verified', 'is', null)
				.returning('id')
				.executeTakeFirst()

			return changed ? id : null
		})

	} catch {
		return null
	}
}

/** Builds an absolute email verification URL bound to the user's email. */
export function url(user: number, email: string, base: string): string {
	return `${base}/verify/${sign(user, email)}`
}
