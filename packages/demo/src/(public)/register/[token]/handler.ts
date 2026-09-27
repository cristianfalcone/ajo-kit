import * as auth from 'ajo-kit-auth'
import type { ActionContext, Request, Response } from 'ajo-kit'
import { Failure, ip } from 'ajo-kit'
import { optional, parse } from 'ajo-kit/validate'
import { confirmed, db, trimmed } from '/src/data'

const Accept = confirmed({ name: optional(trimmed, '') })

export async function page(req: Request) {
	const invite = await auth.invite.get(req.params.token)

	return {
		invite: invite?.email ? {
			email: invite.email,
			name: invite.name,
		} : null,
	}
}

export const actions = {

	default: async (req: Request, res: Response, action: ActionContext) => {
		const token = req.params.token
		const invite = await auth.invite.get(token)

		if (!invite?.email) throw new Failure(400, 'Invalid or expired invitation')

		const input = parse(Accept, req.body)
		const exists = await db()
			.selectFrom('users')
			.select('id')
			.where('email', '=', invite.email)
			.executeTakeFirst()

		if (exists) throw new Failure(400, 'Email already registered')

		const id = await auth.invite.accept(token, {
			name: input.name,
			passwordHash: await auth.password.hash(input.password),
		})

		if (!id) throw new Failure(400, 'Invalid or expired invitation')

		const agent = req.headers['user-agent']
		const session = await auth.session.create(id, false, ip(req), agent)

		action.emit([
			`user:${id}`,
			'admin:sessions',
			'admin:users',
			'admin:stats',
			'admin:registration',
		])

		auth.cookie.write(res, session)

		return { redirect: '/dashboard' }
	}
}
