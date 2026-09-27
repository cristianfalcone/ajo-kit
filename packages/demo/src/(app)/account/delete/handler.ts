import * as auth from 'ajo-kit-auth'
import type { ActionContext, Request, Response } from 'ajo-kit'
import { object, literal, parse } from 'ajo-kit/validate'
import { db } from '/src/data'
import { Forbidden } from 'ajo-kit'
import { can } from '/src/abilities'

const Confirm = object({
	confirmation: literal('DELETE', 'Type DELETE to confirm')
})

export const actions = {

	default: async (req: Request, res: Response, action: ActionContext) => {

		if (can(req.user!.abilities, 'admin:read')) {
			throw new Forbidden('Admins cannot delete their own account')
		}

		parse(Confirm, req.body)

		await db()
			.deleteFrom('users')
			.where('id', '=', req.user!.id)
			.execute()
		action.emit([
			'admin:users',
			'admin:sessions',
			'admin:tokens',
			'admin:stats',
			`user:${req.user!.id}`,
		])

		auth.cookie.clear(res)
		auth.confirm.clearUser(req.user!.id)

		return { deleted: true }
	}
}
