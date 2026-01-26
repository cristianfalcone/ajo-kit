import type { Request, Response } from 'polka'
import { read, clear } from '/src/auth/cookie'
import { remove } from '/src/auth/session'

export async function layout(req: Request) {
	return { user: req.user }
}

export async function signout(req: Request, res: Response) {
	const token = read(req)
	if (token) await remove(token)
	clear(res)
	return { redirect: '/login' }
}
