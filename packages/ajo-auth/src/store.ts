import type { Kysely } from 'ajo-kit/database'
import type { Auth } from './types'

let accessor: (() => Kysely<Auth>) | null = null

/** Sets the Kysely accessor used by auth helpers. */
export const configure = (fn: () => Kysely<any>) => { accessor = fn }

/** Returns the configured auth Kysely instance or throws if missing. */
export const db = () => {
	if (!accessor) throw new Error('Auth database not configured. Call configure() from ajo-auth.')
	return accessor()
}
