import { createHmac, timingSafeEqual } from 'node:crypto'

const secret = process.env.APP_SECRET || 'change-in-production'
const hours = 24

export function sign(user: number): string {

	const expiry = Date.now() + hours * 60 * 60 * 1000
	const data = `${user}:${expiry}`
	const sig = createHmac('sha256', secret).update(data).digest('hex')

	return Buffer.from(`${data}:${sig}`).toString('base64url')
}

export function validate(signature: string): number | null {

	try {

		const decoded = Buffer.from(signature, 'base64url').toString()
		const [user, expiry, sig] = decoded.split(':')

		if (Date.now() > Number(expiry)) return null

		const expected = createHmac('sha256', secret).update(`${user}:${expiry}`).digest('hex')
		const sigBuffer = Buffer.from(sig, 'hex')
		const expectedBuffer = Buffer.from(expected, 'hex')

		if (!timingSafeEqual(sigBuffer, expectedBuffer)) return null

		return Number(user)

	} catch {
		return null
	}
}

export function url(user: number, base: string): string {
	return `${base}/verify/${sign(user)}`
}
