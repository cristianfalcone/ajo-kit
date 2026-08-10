import type { Bootstrap, Middleware } from '@kit'
import type { Database } from '/src/database'

// The engine awaits this after compiled migrations and before listen for both
// audited staging and sealed-artifact startup. Keep idempotent setup here;
// schema evolution belongs in migrations and request policy in middleware.
export const bootstrap: Bootstrap<Database> = async ({ db, config }) => {
	const seeded = await db
		.insertInto('notes')
		.values({ id: 1, text: 'Follow the data from loader to live update.' })
		.onConflict(conflict => conflict.column('id').doNothing())
		.returning('id')
		.executeTakeFirst()

	if (seeded) console.info(`[bootstrap] Seeded ${config.database}`)
}

// Root middleware wraps pages, actions, and /api handlers, giving cross-cutting
// concerns such as auth or request logging one boundary instead of many copies.
export default [] satisfies Middleware[]
