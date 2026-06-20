import { createHmac, timingSafeEqual } from 'node:crypto'

const fallback = 'change-in-production'
const minimum = 32
const hours = 24
const samples = new Set([fallback, 'your-secret-key'])

const production = () => process.env.NODE_ENV === 'production'

const secret = () => {
	const value = process.env.APP_SECRET?.trim() ? process.env.APP_SECRET : undefined

	if (production() && (!value || value.length < minimum || samples.has(value))) {
		const message = 'APP_SECRET must be set to a strong production secret'
		console.error(`[security] ${message}`)
		throw new Error(message)
	}

	return value ?? fallback
}

/** Signs a user id into a time-limited email verification signature. */
export function sign(user: number): string {

	const expiry = Date.now() + hours * 60 * 60 * 1000
	const data = `${user}:${expiry}`
	const sig = createHmac('sha256', secret()).update(data).digest('hex')

	return Buffer.from(`${data}:${sig}`).toString('base64url')
}

/** Validates an email verification signature and returns its user id. */
export function validate(signature: string): number | null {

	const key = secret()

	try {

		const decoded = Buffer.from(signature, 'base64url').toString()
		const [user, expiry, sig] = decoded.split(':')

		if (Date.now() > Number(expiry)) return null

		const expected = createHmac('sha256', key).update(`${user}:${expiry}`).digest('hex')
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
