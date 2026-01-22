import type { Request, Response } from 'polka'
import { UnauthorizedError } from '../../constants'
import { verify } from '../../auth/password'
import { create } from '../../auth/session'
import { write } from '../../auth/cookie'
import { object, string } from 'valibot'
import { users, parse, email } from '../../data'

const Login = object({
	email,
	password: string(),
})

export async function authenticate(req: Request, res: Response) {

	const input = parse(Login, req.body)

	const user = await users.byEmail(input.email)

	if (!user?.password || !await verify(input.password, user.password)) {
		throw new UnauthorizedError('Invalid credentials')
	}

	const token = await create(user.id)

	write(res, token)

	return { redirect: '/' }
}
