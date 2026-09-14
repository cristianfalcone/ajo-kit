import { db } from './store'
import { generate, hash } from './session'
import { abilities as granted, scoped } from './account'
import { can, intersect, merge } from './ability.client'
import { clearToken } from './confirm'
import type { Ability } from './ability.client'

const lifetime = 90 * 24 * 60 * 60 * 1000

/** Creates a token attenuated to current authority, optionally for one exact subject. */
export async function create(
	user: number,
	name: string,
	abilities: Ability[],
	options: { subject?: string; ttl?: number | null } = {}
) {
	if (options.subject !== undefined && (typeof options.subject !== 'string' || !options.subject.trim())) {
		throw new Error('Token subject is required')
	}

	const subject = options.subject ?? null
	const ttl = options.ttl === undefined ? lifetime : options.ttl
	const expiry = ttl === null ? null : Date.now() + ttl

	if (ttl !== null && (typeof ttl !== 'number' || !Number.isFinite(ttl) || ttl <= 0 || !Number.isFinite(new Date(expiry!).getTime()))) {
		throw new Error('Token TTL must be a positive finite duration')
	}
	if (subject !== null && (ttl === null || ttl > lifetime)) {
		throw new Error('Scoped token TTL must not exceed 90 days')
	}

	const account = subject === null
		? await granted(user)
		: merge(await granted(user), await scoped(user, subject))
	const missing = abilities.find(ability => !can(account, ability))

	if (missing) throw new Error(`Requested ability exceeds account authority: ${missing}`)

	const plain = generate()
	const id = hash(plain)

	await db().insertInto('tokens').values({
		id,
		user,
		name,
		abilities: JSON.stringify(intersect(abilities, account)),
		subject,
		last: null,
		expiry: expiry === null ? null : new Date(expiry).toISOString()
	}).execute()

	return plain
}

/** Resolves a plaintext API token to its stored bearer identity. */
export async function validate(plain: string) {

	const id = hash(plain)

	const token = await db()
		.selectFrom('tokens')
		.select(['id', 'user', 'abilities', 'subject', 'expiry'])
		.where('id', '=', id)
		.executeTakeFirst()

	if (!token) return null

	if (token.subject !== null && (typeof token.subject !== 'string' || !token.subject.trim() || token.expiry === null)) return null

	if (token.expiry !== null && !(Date.parse(token.expiry) > Date.now())) {
		await db().deleteFrom('tokens').where('id', '=', id).execute()
		return null
	}

	let abilities: unknown

	try {
		abilities = JSON.parse(token.abilities)
	} catch {
		return null
	}

	if (!Array.isArray(abilities) || !abilities.every(ability => typeof ability === 'string')) return null

	await db().updateTable('tokens')
		.set({ last: new Date().toISOString() })
		.where('id', '=', id)
		.execute()

	return { ...token, abilities: abilities as Ability[] }
}

/** Revokes a token by full stored id only when it belongs to the given user. */
export async function revoke(user: number, id: string): Promise<boolean> {

	const result = await db().deleteFrom('tokens')
		.where('user', '=', user)
		.where('id', '=', id)
		.executeTakeFirst()

	if (result.numDeletedRows === 0n) return false
	clearToken(user, id)
	return true
}

/** Deletes every API token owned by a user. */
export const purge = (user: number) =>
	db().deleteFrom('tokens').where('user', '=', user).execute()

/** Lists stored API tokens for a user without plaintext secrets. */
export const list = (user: number) =>
	db().selectFrom('tokens')
		.select(['id', 'name', 'abilities', 'subject', 'last', 'expiry', 'created'])
		.where('user', '=', user)
		.execute()

/** Deletes expired API tokens. */
export const prune = () =>
	db().deleteFrom('tokens')
		.where('expiry', '<', new Date().toISOString())
		.execute()
