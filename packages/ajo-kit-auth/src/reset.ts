import { generate, hash } from './session'
import { db } from 'ajo-kit/database'
import type { Auth } from './types'
import { clearUser } from './confirm'

const hours = 1

/** Creates a password reset token and returns its plaintext value. */
export async function create(user: number): Promise<string> {

	await db<Auth>().deleteFrom('resets').where('user', '=', user).execute()

	const plain = generate()
	const id = hash(plain)
	const expiry = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()

	await db<Auth>().insertInto('resets').values({ id, user, expiry }).execute()

	return plain
}

/** Previews whether a reset token is active; only consume() is a mutation boundary. */
export async function validate(plain: string): Promise<number | null> {

	const id = hash(plain)
	const reset = await db<Auth>()
		.selectFrom('resets')
		.select(['user', 'expiry'])
		.where('id', '=', id)
		.executeTakeFirst()

	if (!reset || new Date(reset.expiry) < new Date()) return null

	return reset.user
}

/** Atomically consumes a reset, changes the password, and revokes credentials. */
export async function consume(plain: string, passwordHash: string): Promise<number | null> {
	const id = hash(plain)
	const now = new Date().toISOString()
	const user = await db<Auth>().transaction().execute(async trx => {
		const reset = await trx
			.deleteFrom('resets')
			.where('id', '=', id)
			.where('expiry', '>=', now)
			.returning('user')
			.executeTakeFirst()

		if (!reset) return null

		await trx
			.updateTable('users')
			.set({ password: passwordHash, updated: now })
			.where('id', '=', reset.user)
			.execute()
		await trx.deleteFrom('sessions').where('user', '=', reset.user).execute()
		await trx.deleteFrom('tokens').where('user', '=', reset.user).execute()
		await trx.deleteFrom('resets').where('user', '=', reset.user).execute()

		return reset.user
	})

	if (user !== null) clearUser(user)

	return user
}
