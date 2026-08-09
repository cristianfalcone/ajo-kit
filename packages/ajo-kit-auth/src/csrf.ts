import { origin, type Request, type Response } from 'ajo-kit'
import { env, hmacSha256Hex, timingSafeEqual } from 'ajo-kit/platform'
import { generate } from './session'
import { parse } from './cookie'
import * as secret from './secret'

const NAME = 'XSRF-TOKEN'
const hex = /^[0-9a-f]+$/i
const secure = () => env('NODE_ENV') === 'production' ? '; Secure' : ''
const ascii = (value: string) => Uint8Array.from(value, character => character.charCodeAt(0))

const sign = (session: string, token: string) =>
	hmacSha256Hex(secret.value(), `${session}:${token}`)

const equal = (left: string, right: string) => {
	if (!hex.test(left) || !hex.test(right)) return false

	return timingSafeEqual(ascii(left.toLowerCase()), ascii(right.toLowerCase()))
}

const seal = (session: string) => {
	const token = generate()
	return `${token}.${sign(session, token)}`
}

const signed = (req: Request, token: string) => {
	if (!req.session) return false

	const parts = token.split('.')
	if (parts.length !== 2) return false

	const [plain, mac] = parts
	if (!plain || !mac) return false

	return equal(mac, sign(req.session.id, plain))
}

/** Sets a readable session-bound XSRF cookie and returns its token. */
export function set(req: Request, res: Response) {
	if (!req.session) throw new Error('CSRF token requires a session')

	const token = seal(req.session.id)
	res.setHeader('Set-Cookie', `${NAME}=${token}; Path=/; SameSite=Lax${secure()}`)
	return token
}

/** Validates signed session-bound CSRF or same-origin proof. */
export function verify(req: Request): boolean {

	// 1. Check signed double-submit token

	const cookie = parse(req.headers.cookie, NAME)
	const header = req.headers['x-xsrf-token'] as string | undefined

	if (cookie && cookie === header && signed(req, header)) return true

	// 2. Check same-origin (Origin or Referer matches host)

	const source = req.headers.origin
	const referer = req.headers.referer

	if (!source && !referer) return false

	const base = origin(req)

	if (source) {
		try {
			const url = new URL(source)
			if (url.origin === base) return true
		} catch {}
	}

	if (referer) {
		try {
			const url = new URL(referer)
			if (url.origin === base) return true
		} catch {}
	}

	return false
}
