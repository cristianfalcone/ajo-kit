import type { Request } from 'polka'
import { object, string } from 'valibot'
import { verify } from '/src/auth/password'
import { stamp } from '/src/auth/confirm'
import { db, parse } from '/src/data'
import { UnauthorizedError } from '/src/constants'

const Confirm = object({ password: string() })

export const actions = {

	default: async (req: Request) => {

		const input = parse(Confirm, req.body)

		const user = await db()
			.selectFrom('users')
			.select(['password'])
			.where('id', '=', req.user!.id)
			.executeTakeFirst()

		if (!user?.password || !await verify(input.password, user.password)) {
			throw new UnauthorizedError('Invalid password')
		}

		stamp(req.user!.id)

		return { confirmed: true }
	}
}
