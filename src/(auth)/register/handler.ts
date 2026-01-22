import type { Request, Response } from 'polka'
import { RouteError } from '../../constants'
import { hash } from '../../auth/password'
import { create } from '../../auth/session'
import { write } from '../../auth/cookie'
import { users, roles } from '../../data'
import { v, parse, email, password, username, trimmed } from '../../schemas'

const Signup = v.object({
	email,
	password,
	username,
	firstName: v.optional(trimmed, ''),
	lastName: v.optional(trimmed, ''),
})

export async function signup(req: Request, res: Response) {

	const input = parse(Signup, req.body)

	const exists = await users.byEmail(input.email)

	if (exists) {
		throw new RouteError(400, 'Email already registered')
	}

	const hashed = await hash(input.password)

	const { id } = await users.create({
		...input,
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
