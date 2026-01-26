import type { Request, Response } from 'polka'
import { object, literal } from 'valibot'
import { clear as clearCookie } from '/src/auth/cookie'
import { clear as clearConfirm } from '/src/auth/confirm'
import { db, parse } from '/src/data'
import { ForbiddenError } from '/src/constants'

const Confirm = object({
	confirmation: literal('DELETE', 'Type DELETE to confirm')
})

export async function destroy(req: Request, res: Response) {

	if (req.user!.roles.includes('admin')) {
		throw new ForbiddenError('Admins cannot delete their own account')
	}

	parse(Confirm, req.body)

	await db()
		.deleteFrom('users')
		.where('id', '=', req.user!.id)
		.execute()

	clearCookie(res)
	clearConfirm(req.user!.id)

	return { deleted: true }
}
