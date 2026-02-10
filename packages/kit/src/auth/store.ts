import type { Kysely } from 'kysely'

let accessor: (() => Kysely<any>) | null = null

export const configure = (fn: () => Kysely<any>) => { accessor = fn }

export const db = () => {
	if (!accessor) throw new Error('Auth database not configured. Call configure() from ajo-kit/auth/store.')
	return accessor()
}
