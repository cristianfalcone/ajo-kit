import type { Request, Response } from 'ajo-kit'
import { env } from 'ajo-kit/platform'

const name = 'session'

/** Secure follows the app's canonical scheme: an https deployment locks its
 * cookies to TLS; an http origin must not set a flag its own scheme rejects. */
export const secure = () => env('APP_URL')?.startsWith('https:') ? '; Secure' : ''

const base = () => `HttpOnly; SameSite=Lax; Path=/${secure()}`

/** Reads one cookie by exact name and rejects duplicates. */
export const parse = (header: string | undefined, key: string) => {
	let value: string | undefined

	for (const part of header?.split(';') ?? []) {
		const trimmed = part.trim()
		const index = trimmed.indexOf('=')
		if (index === -1) continue
		if (trimmed.slice(0, index) !== key) continue
		if (value !== undefined) return
		value = trimmed.slice(index + 1)
	}

	return value
}

/** Reads the session cookie from a request. */
export const read = (req: Request) => parse(req.headers.cookie, name)

/** Writes the session cookie to a response. */
export const write = (res: Response, value: string, remember = false) => {
	const age = remember ? 31536000 : 2592000
	res.setHeader('Set-Cookie', `${name}=${value}; ${base()}; Max-Age=${age}`)
}

/** Clears the session cookie on a response. */
export const clear = (res: Response) => {
	res.setHeader('Set-Cookie', `${name}=; ${base()}; Max-Age=0`)
}
