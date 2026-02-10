import type { Request, Response } from '@kit'
import { send } from '@kit/server'
import { createHash } from 'node:crypto'
import { db } from '/src/data'

export default {

	async post(req: Request, res: Response) {

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
			}
		}

		send(res, 200, { message: 'Logged out' })
	}
}
