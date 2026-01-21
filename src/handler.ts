import type { Request, Response } from 'polka'
import { read, clear } from './auth/cookie'
import { remove } from './auth/session'

export async function layout(req: Request) {
	return { auth: req.auth ?? null }
}

export async function signout(req: Request, res: Response) {
	const token = read(req)
	if (token) await remove(token)
	clear(res)
	return { redirect: '/' }
}
