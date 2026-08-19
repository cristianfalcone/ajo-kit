import * as auth from '@kit/auth'
import type { ActionContext, Request, Response } from '@kit'
import { Failure, ip } from '@kit'
import { object, optional, string, forward, partialCheck, pipe } from '@kit/validate'
import { db, password, trimmed } from '/src/data'
import { parse } from '@kit/validate'

const Accept = pipe(
	object({
		password,
		confirm: string(),
		name: optional(trimmed, ''),
	}),
	forward(
		partialCheck(
			[['password'], ['confirm']],
			input => input.password === input.confirm,
			'Passwords do not match'
		),
		['confirm']
	)
)

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
			password: await auth.password.hash(input.password),
		})

		if (!id) throw new Failure(400, 'Invalid or expired invitation')

		const agent = req.headers['user-agent']
		const session = await auth.session.create(id, false, ip(req), agent)

		action.emit([
			`sessions:${id}`,
			`dashboard:${id}`,
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
