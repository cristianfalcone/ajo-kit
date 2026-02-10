import type { Request, Response } from 'ajo-kit'
import { generate } from './session'

const NAME = 'XSRF-TOKEN'

export function set(res: Response) {
	const token = generate()
	res.setHeader('Set-Cookie', `${NAME}=${token}; Path=/; SameSite=Lax`)
	return token
}

export function verify(req: Request): boolean {

	// 1. Check XSRF token (double-submit cookie)

	const cookie = req.headers.cookie?.match(/XSRF-TOKEN=([^;]+)/)?.[1]
	const header = req.headers['x-xsrf-token'] as string | undefined

	if (cookie && cookie === header) return true

	// 2. Check same-origin (Origin or Referer matches host)

	const host = req.headers.host
	const origin = req.headers.origin
	const referer = req.headers.referer

	if (origin) {
		try {
			const url = new URL(origin)
			if (url.host === host) return true
		} catch {}
	}

	if (referer) {
		try {
			const url = new URL(referer)
			if (url.host === host) return true
		} catch {}
	}

	return false
}
