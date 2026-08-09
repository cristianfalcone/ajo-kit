import { base64UrlDecode, base64UrlEncode, hmacSha256Hex, timingSafeEqual } from 'ajo-kit/platform'
import * as secret from './secret'

const hours = 24
const decoder = new TextDecoder()
const encoder = new TextEncoder()
const hex = /^[0-9a-f]+$/i

/** Signs a user id into a time-limited email verification signature. */
export function sign(user: number): string {

	const expiry = Date.now() + hours * 60 * 60 * 1000
	const data = `${user}:${expiry}`
	const sig = hmacSha256Hex(secret.value(), data)

	return base64UrlEncode(`${data}:${sig}`)
}

/** Validates an email verification signature and returns its user id. */
export function validate(signature: string): number | null {

	const key = secret.value()

	try {

		const decoded = decoder.decode(base64UrlDecode(signature))
		const [user, expiry, sig] = decoded.split(':')

		if (Date.now() > Number(expiry)) return null

		const expected = hmacSha256Hex(key, `${user}:${expiry}`)
		if (!sig || !hex.test(sig)) return null
		const actual = encoder.encode(sig.toLowerCase())
		const wanted = encoder.encode(expected)

		if (!timingSafeEqual(actual, wanted)) return null

		return Number(user)

	} catch {
		return null
	}
}

/** Builds an absolute email verification URL for a user. */
export function url(user: number, base: string): string {
	return `${base}/verify/${sign(user)}`
}
