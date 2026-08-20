import * as auth from '@kit/auth'
import type { ActionContext, Request, Response } from '@kit'
import { object, string, pipe, forward, partialCheck } from '@kit/validate'
import { password } from '/src/data'
import { parse } from '@kit/validate'
import { Failure } from '@kit'

const Reset = pipe(
	object({
		password,
		confirm: string(),
	}),
	forward(
		partialCheck(
			[['password'], ['confirm']],
			input => input.password === input.confirm,
			'Passwords must match'
		),
		['confirm']
	)
)

export async function page(req: Request) {
	const token = req.params.token
	const user = await auth.reset.validate(token)
	return { valid: !!user }
}

export const actions = {

	default: async (req: Request, _res: Response, action: ActionContext) => {

		const token = req.params.token
		const input = parse(Reset, req.body)

		if (!await auth.reset.validate(token)) throw new Failure(400, 'Invalid or expired reset link')

		const hashed = await auth.password.hash(input.password)
		const user = await auth.reset.consume(token, hashed)

		if (user === null) throw new Failure(400, 'Invalid or expired reset link')

		action.emit([
			`profile:${user}`,
			`sessions:${user}`,
			`tokens:${user}`,
			`dashboard:${user}`,
			`user:${user}`,
			'admin:sessions',
			'admin:tokens',
			'admin:users',
			'admin:stats',
		])

		return { redirect: '/login' }
	}
}
