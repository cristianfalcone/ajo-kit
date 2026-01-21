import type { Request, Response } from 'polka'
import { UnauthorizedError } from '../../constants'
import { verify } from '../../auth/password'
import { create } from '../../auth/session'
import { write } from '../../auth/cookie'
import { users } from '../../data'

export async function authenticate(req: Request, res: Response) {

	const { body } = req
	const email = (body.email as string)?.trim().toLowerCase()
	const password = body.password as string

	if (!email || !password) {
		throw new UnauthorizedError('Email and password required')
	}

	const user = await users.byEmail(email)

	if (!user?.password || !await verify(password, user.password)) {
		throw new UnauthorizedError('Invalid credentials')
	}

	const token = await create(user.id)

	write(res, token)

	return { redirect: '/' }
}
