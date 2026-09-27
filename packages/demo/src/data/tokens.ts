import * as auth from 'ajo-kit-auth'
import { Failure, Forbidden } from 'ajo-kit'
import { delegate, normalize, unknown } from '/src/abilities'

/** Resolves requested token abilities within the catalog and the account's delegable grants. */
export function requested(abilities: string[], grants: string[]) {
	const bad = unknown(normalize(abilities))

	if (bad.length > 0) throw new Failure(400, `Unknown abilities: ${bad.join(', ')}`)

	const delegated = delegate(abilities, grants)

	if (!auth.all(grants, delegated)) throw new Forbidden('Requested abilities exceed account abilities')

	return delegated
}

/** Lists a user's API tokens without their secrets. */
export const listed = async (user: number) => (await auth.token.list(user)).map(token => ({
	id: token.id,
	name: token.name,
	abilities: JSON.parse(token.abilities) as string[],
	last: token.last,
	expiry: token.expiry,
	created: token.created,
}))
