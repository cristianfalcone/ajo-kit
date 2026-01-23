import type { Request, Response } from 'polka'
import { read, clear, remove } from '/src/auth'

export async function layout(req: Request) {
	const user = req.user
	if (user) return { user }
}

export async function signout(req: Request, res: Response) {
	const token = read(req)
	if (token) await remove(token)
	clear(res)
	return { redirect: '/' }
}
