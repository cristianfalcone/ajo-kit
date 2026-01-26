import type { Request, Response } from 'polka'
import { generate } from './session'

const NAME = 'XSRF-TOKEN'

export function set(res: Response) {
	const token = generate()
	res.setHeader('Set-Cookie', `${NAME}=${token}; Path=/; SameSite=Lax`)
	return token
}

export function verify(req: Request): boolean {
	const cookie = req.headers.cookie?.match(/XSRF-TOKEN=([^;]+)/)?.[1]
	const header = req.headers['x-xsrf-token'] as string | undefined
	return !!cookie && cookie === header
}
