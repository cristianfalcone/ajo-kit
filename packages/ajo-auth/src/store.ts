import type { Kysely } from 'ajo-kit/database'
import type { Auth } from './types'

let accessor: (() => Kysely<Auth>) | null = null

export const configure = (fn: () => Kysely<any>) => { accessor = fn }

export const db = () => {
	if (!accessor) throw new Error('Auth database not configured. Call configure() from ajo-auth/store.')
	return accessor()
}
