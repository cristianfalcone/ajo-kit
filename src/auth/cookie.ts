import type { Request, Response } from 'polka'

const name = 'session'
const base = 'HttpOnly; SameSite=Lax; Path=/'

export const read = (req: Request) => req.headers.cookie?.match(/session=([^;]+)/)?.[1]

export const write = (res: Response, value: string, remember = false) => {
	const maxAge = remember ? 31536000 : 2592000
	res.setHeader('Set-Cookie', `${name}=${value}; ${base}; Max-Age=${maxAge}`)
}

export const clear = (res: Response) =>
	res.setHeader('Set-Cookie', `${name}=; ${base}; Max-Age=0`)
