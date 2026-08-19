import { db as base } from '@kit/database'
import type { DB, Signup } from './types'

export type { Signup }

const singleton = 1

const db = () => base<DB>()
const stamp = (time = Date.now()) => new Date(time).toISOString()

function signup(value: string): Signup {
	if (value === 'open' || value === 'invite') return value

	throw new Error(`Invalid registration signup mode: ${value}`)
}

/** Returns the durable signup mode, initializing the singleton policy row when needed. */
export async function policy(): Promise<Signup> {
	const row = await db()
		.selectFrom('registration')
		.select('signup')
		.where('id', '=', singleton)
		.executeTakeFirst()

	if (row) return signup(row.signup)

	await db()
		.insertInto('registration')
		.values({ id: singleton, signup: 'open', updated: null, updater: null })
		.onConflict(oc => oc.column('id').doNothing())
		.execute()

	const saved = await db()
		.selectFrom('registration')
		.select('signup')
		.where('id', '=', singleton)
		.executeTakeFirst()

	return saved ? signup(saved.signup) : 'open'
}

/** Persists the singleton signup mode and records the admin who changed it. */
export async function set(value: Signup, user: number): Promise<void> {
	const next = signup(value)
	const now = stamp()

	await db()
		.insertInto('registration')
		.values({ id: singleton, signup: next, updated: now, updater: user })
		.onConflict(oc => oc.column('id').doUpdateSet({
			signup: next,
			updated: now,
			updater: user,
		}))
		.execute()
}
