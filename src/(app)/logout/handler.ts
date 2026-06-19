import type { Request, Response } from '@kit'
import { send, emit } from '@kit/server'
import { createHash } from 'node:crypto'
import { db } from '/src/data'
import { requireAbility } from '@kit/auth/guard'
import { clear as clearConfirm } from '@kit/auth/confirm'

export default {

	async post(req: Request, res: Response) {

		requireAbility(req, 'tokens:delete')

		if (req.token) {

			const auth = req.headers.authorization
			const plain = auth?.slice(7)

			if (plain) {

				const id = createHash('sha256').update(plain).digest('hex')

				await db()
					.deleteFrom('tokens')
					.where('id', '=', id)
					.where('user', '=', req.user!.id)
					.execute()
				emit([`tokens:${req.user!.id}`, `dashboard:${req.user!.id}`, `user:${req.user!.id}`, 'admin:tokens', 'admin:stats'])
			}
		}

		clearConfirm(req.user!.id)
		send(res, 200, { message: 'Logged out' })
	}
}
