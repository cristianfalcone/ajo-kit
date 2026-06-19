import { trustedOrigin, type Request, type Response } from 'ajo-kit'
import { generate } from './session'
import { readCookie } from './cookie'

const NAME = 'XSRF-TOKEN'
const secure = () => process.env.NODE_ENV === 'production' ? '; Secure' : ''

export function set(res: Response) {
	const token = generate()
	res.setHeader('Set-Cookie', `${NAME}=${token}; Path=/; SameSite=Lax${secure()}`)
	return token
}

export function verify(req: Request): boolean {

	// 1. Check XSRF token (double-submit cookie)

	const cookie = readCookie(req.headers.cookie, NAME)
	const header = req.headers['x-xsrf-token'] as string | undefined

	if (cookie && cookie === header) return true

	// 2. Check same-origin (Origin or Referer matches host)

	const origin = req.headers.origin
	const referer = req.headers.referer

	if (!origin && !referer) return false

	const trusted = trustedOrigin(req)

	if (origin) {
		try {
			const url = new URL(origin)
			if (url.origin === trusted) return true
		} catch {}
	}

	if (referer) {
		try {
			const url = new URL(referer)
			if (url.origin === trusted) return true
		} catch {}
	}

	return false
}
