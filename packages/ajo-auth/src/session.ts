import { createHash, randomBytes } from 'node:crypto'
import { db } from './store'

/** Generates a random plaintext credential value. */
export const generate = () => randomBytes(32).toString('base64url')
/** Hashes a plaintext session credential for database storage. */
export const hash = (plain: string) => createHash('sha256').update(plain).digest('hex')

/** Creates a cookie session and returns its plaintext credential. */
export const create = async (
	user: number,
	remember = false,
	ip?: string,
	agent?: string
) => {

	const plain = generate()
	const id = hash(plain)
	const days = remember ? 365 : 30
	const expiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
	const last = new Date().toISOString()

	await db().insertInto('sessions').values({
		id,
		user,
		expiry,
		ip: ip ?? null,
		agent: agent ?? null,
		last
	}).execute()

	return plain
}

/** Resolves a plaintext session credential to an active stored session. */
export const validate = async (plain: string) => {

	const id = hash(plain)

	const session = await db()
		.selectFrom('sessions')
		.select(['id', 'user', 'expiry'])
		.where('id', '=', id)
		.executeTakeFirst()

	if (!session || new Date(session.expiry) < new Date()) return null

	return session
}

/** Deletes the session matching a plaintext credential. */
export const remove = (plain: string) =>
	db().deleteFrom('sessions').where('id', '=', hash(plain)).execute()

/** Updates the last-seen timestamp for a session credential. */
export const touch = (plain: string) =>
	db().updateTable('sessions')
		.set({ last: new Date().toISOString() })
		.where('id', '=', hash(plain))
		.execute()
