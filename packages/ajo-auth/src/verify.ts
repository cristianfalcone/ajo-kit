import { createHmac, timingSafeEqual } from 'node:crypto'

const secret = process.env.APP_SECRET || 'change-in-production'
const hours = 24

/** Signs a user id into a time-limited email verification signature. */
export function sign(user: number): string {

	const expiry = Date.now() + hours * 60 * 60 * 1000
	const data = `${user}:${expiry}`
	const sig = createHmac('sha256', secret).update(data).digest('hex')

	return Buffer.from(`${data}:${sig}`).toString('base64url')
}

/** Validates an email verification signature and returns its user id. */
export function validate(signature: string): number | null {

	try {

		const decoded = Buffer.from(signature, 'base64url').toString()
		const [user, expiry, sig] = decoded.split(':')

		if (Date.now() > Number(expiry)) return null

		const expected = createHmac('sha256', secret).update(`${user}:${expiry}`).digest('hex')
		const actual = Buffer.from(sig, 'hex')
		const wanted = Buffer.from(expected, 'hex')

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
