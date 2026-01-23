import { randomBytes } from 'node:crypto'
import { sessions } from '/src/data/auth'

const days = 30

export const generate = () => randomBytes(32).toString('base64url')

export const create = async (userId: number) => {
	const id = generate()
	const expiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
	await sessions.create({ id, userId, expiry })
	return id
}

export const validate = async (id: string) => {
	const session = await sessions.find(id)
	if (!session || new Date(session.expiry) < new Date()) return null
	return session
}

export const remove = (id: string) => sessions.remove(id)
