import { db, sql } from 'ajo-kit/database'
import { randomBase64Url, sha256Hex } from 'ajo-kit/platform'
import type { Auth } from './types'
import { stamp } from './format'

const minute = 60 * 1000
const day = 24 * 60 * 60 * 1000
const idle = 30 * minute
const pace = 5 * minute

type Row = {
	id: string
	user: number
	expiry: string
	last: string | null
	created: string
}

function time(value: string | null): number {
	const parsed = value ? Date.parse(value) : Number.NaN

	return Number.isFinite(parsed) ? parsed : 0
}

function age(session: Row, now: number): number {
	return now - time(session.last ?? session.created)
}

function expired(session: Row, now: number): boolean {
	return time(session.expiry) <= now || age(session, now) > idle
}

function stale(session: Row, now: number): boolean {
	return age(session, now) > pace
}

function cutoff(now = Date.now()): string {
	return stamp(now - idle)
}

function drop(id: string) {
	return db<Auth>()
		.deleteFrom('sessions')
		.where('id', '=', id)
		.execute()
}

/** Generates a random plaintext credential value. */
export function generate(): string {
	return randomBase64Url(32)
}

/** Hashes a plaintext session credential for database storage. */
export function hash(plain: string): string {
	return sha256Hex(plain)
}

/**
 * Creates a cookie session and returns its plaintext credential. Remembering
 * extends only the absolute lifetime from 30 to 365 days; every session keeps
 * the same 30-minute idle timeout.
 */
export const create = async (
	user: number,
	remember = false,
	ip?: string,
	agent?: string
) => {

	const plain = generate()
	const id = hash(plain)
	const lifetime = remember ? 365 : 30
	const now = Date.now()
	const expiry = stamp(now + lifetime * day)
	const last = stamp(now)

	await db<Auth>().insertInto('sessions').values({
		id,
		user,
		expiry,
		ip: ip ?? null,
		agent: agent ?? null,
		last
	}).execute()

	return plain
}

/**
 * Resolves a session credential, enforcing expiry and throttled activity touch.
 *
 * Pass `activity = false` for background checks that must not renew activity.
 */
export const validate = async (plain: string, activity = true) => {

	const id = hash(plain)

	const session = await db<Auth>()
		.selectFrom('sessions')
		.select(['id', 'user', 'expiry', 'last', 'created'])
		.where('id', '=', id)
		.executeTakeFirst() as Row | undefined

	if (!session) return null

	const now = Date.now()

	if (expired(session, now)) {
		await drop(id)
		return null
	}

	if (activity && stale(session, now)) {
		const last = stamp(now)

		await db<Auth>().updateTable('sessions').set({ last }).where('id', '=', id).execute()

		return { ...session, last }
	}

	return session
}

/** Deletes the session matching a plaintext credential. */
export const remove = (plain: string) =>
	drop(hash(plain))

/** Deletes sessions past their absolute or idle timeout. */
export const prune = () => {
	const now = Date.now()

	return db<Auth>()
		.deleteFrom('sessions')
		.where(eb => eb.or([
			eb('expiry', '<=', stamp(now)),
			sql<boolean>`unixepoch(coalesce(last, created)) <= unixepoch(${cutoff(now)})`,
		]))
		.execute()
}
