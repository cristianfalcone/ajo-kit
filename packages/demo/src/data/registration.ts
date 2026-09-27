import { db } from '.'
import type { Signup } from './types'

/** Returns the signup mode from the migrated singleton row; a missing row throws instead of opening signup. */
export const policy = async (): Promise<Signup> => (await db()
	.selectFrom('registration')
	.select('signup')
	.where('id', '=', 1)
	.executeTakeFirstOrThrow()).signup

/** Persists the signup mode and records the admin who changed it. */
export async function set(signup: Signup, updater: number): Promise<void> {
	const updated = new Date().toISOString()

	await db()
		.insertInto('registration')
		.values({ id: 1, signup, updated, updater })
		.onConflict(oc => oc.column('id').doUpdateSet({ signup, updated, updater }))
		.execute()
}
