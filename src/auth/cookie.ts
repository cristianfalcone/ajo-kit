import type { Request, Response } from 'polka'

const NAME = 'session'
const OPTS = 'HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000'

export const read = (req: Request) => req.headers.cookie?.match(/session=([^;]+)/)?.[1]

export const write = (res: Response, value: string) =>
	res.setHeader('Set-Cookie', `${NAME}=${value}; ${OPTS}`)

export const clear = (res: Response) =>
	res.setHeader('Set-Cookie', `${NAME}=; ${OPTS}; Max-Age=0`)
