import * as auth from 'ajo-kit-auth'
import type { ActionContext, Request, Response } from 'ajo-kit'
import { parse } from 'ajo-kit/validate'
import { confirmed } from '/src/data'
import { Failure } from 'ajo-kit'

const Reset = confirmed({})

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
			`user:${user}`,
			'admin:sessions',
			'admin:tokens',
			'admin:users',
			'admin:stats',
		])

		return { redirect: '/login' }
	}
}
