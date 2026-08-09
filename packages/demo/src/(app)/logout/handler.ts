import * as auth from '@kit/auth'
import type { Request, Response } from '@kit'
import { sha256Hex } from '@kit/platform'
import { send, emit } from '@kit/server'
import { db } from '/src/data'

export default {

	async post(req: Request, res: Response) {

		auth.authorize(req, 'tokens:delete')

		if (req.token) {

			const auth = req.headers.authorization
			const plain = auth?.slice(7)

			if (plain) {

				const id = sha256Hex(plain)

				await db()
					.deleteFrom('tokens')
					.where('id', '=', id)
					.where('user', '=', req.user!.id)
					.execute()
				emit([`tokens:${req.user!.id}`, `dashboard:${req.user!.id}`, `user:${req.user!.id}`, 'admin:tokens', 'admin:stats'])
			}
		}

		auth.confirm.clear(req)
		send(res, 200, { message: 'Logged out' })
	}
}
