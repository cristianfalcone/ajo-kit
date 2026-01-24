import type { Request, Response } from 'polka'
import { object, string } from 'valibot'
import { verify, create, write } from '/src/auth'
import { users, parse, email } from '/src/data'
import { UnauthorizedError } from '/src/constants'

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

	return { redirect: '/dashboard' }
}
