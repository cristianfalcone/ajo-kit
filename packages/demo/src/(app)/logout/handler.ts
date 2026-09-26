import * as auth from '@kit/auth'
import type { Request, Response } from '@kit'
import { send, emit } from '@kit/server'

export default {

	async post(req: Request, res: Response) {

		auth.authorize(req, 'tokens:delete')

		if (req.token && await auth.token.revoke(req.user!.id, req.token.id)) {
			emit([`tokens:${req.user!.id}`, `dashboard:${req.user!.id}`, `user:${req.user!.id}`, 'admin:tokens', 'admin:stats'])
		}

		auth.confirm.clear(req)
		send(res, 200, { message: 'Logged out' })
	}
}
