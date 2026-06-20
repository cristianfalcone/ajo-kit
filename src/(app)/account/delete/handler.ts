import * as auth from '@kit/auth'
import type { Request, Response } from '@kit'
import { object, literal } from '@kit/validate'
import { db } from '/src/data'
import { parse } from '@kit/validate'
import { Forbidden } from '@kit'
import { emit } from '@kit/server'

const Confirm = object({
	confirmation: literal('DELETE', 'Type DELETE to confirm')
})

export const actions = {

	default: async (req: Request, res: Response) => {

		if (req.user!.roles?.includes('admin')) {
			throw new Forbidden('Admins cannot delete their own account')
		}

		parse(Confirm, req.body)

		await db()
			.deleteFrom('users')
			.where('id', '=', req.user!.id)
			.execute()
		emit([
			'admin:users',
			'admin:sessions',
			'admin:tokens',
			'admin:stats',
			`user:${req.user!.id}`,
			`dashboard:${req.user!.id}`,
			`sessions:${req.user!.id}`,
			`tokens:${req.user!.id}`,
		])

		auth.cookie.clear(res)
		auth.confirm.user(req.user!.id)

		return { deleted: true }
	}
}
