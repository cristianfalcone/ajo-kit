import type { Request, Response } from 'polka'
import { RouteError } from '../../constants'
import { hash } from '../../auth/password'
import { create } from '../../auth/session'
import { write } from '../../auth/cookie'
import { users, roles } from '../../data'

export async function signup(req: Request, res: Response) {

	const { body } = req
	const email = (body.email as string)?.trim().toLowerCase()
	const password = body.password as string
	const username = (body.username as string)?.trim()
	const firstName = (body.firstName as string)?.trim() || ''
	const lastName = (body.lastName as string)?.trim() || ''

	if (!email || !password || !username) {
		throw new RouteError(400, 'Email, username and password required')
	}

	if (password.length < 8) {
		throw new RouteError(400, 'Password must be at least 8 characters')
	}

	const exists = await users.byEmail(email)

	if (exists) {
		throw new RouteError(400, 'Email already registered')
	}

	const hashed = await hash(password)

	const { id } = await users.create({
		email,
		username,
		firstName,
		lastName,
		password: hashed,
	})

	const role = await roles.find('user')

	if (role) {
		await roles.assign(id, role.id)
	}

	const token = await create(id)

	write(res, token)

	return { redirect: '/' }
}
