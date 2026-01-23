import type { Request, Response } from 'polka'

const name = 'session'
const opts = 'HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000'

export const read = (req: Request) => req.headers.cookie?.match(/session=([^;]+)/)?.[1]

export const write = (res: Response, value: string) =>
	res.setHeader('Set-Cookie', `${name}=${value}; ${opts}`)

export const clear = (res: Response) =>
	res.setHeader('Set-Cookie', `${name}=; ${opts}; Max-Age=0`)
