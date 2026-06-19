import type { Request, Response } from 'ajo-kit'

const name = 'session'
const base = 'HttpOnly; SameSite=Lax; Path=/'

export const readCookie = (header: string | undefined, key: string) => {
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

export const read = (req: Request) => readCookie(req.headers.cookie, name)

export const write = (res: Response, value: string, remember = false) => {
	const maxAge = remember ? 31536000 : 2592000
	res.setHeader('Set-Cookie', `${name}=${value}; ${base}; Max-Age=${maxAge}`)
}

export const clear = (res: Response) =>
	res.setHeader('Set-Cookie', `${name}=; ${base}; Max-Age=0`)
