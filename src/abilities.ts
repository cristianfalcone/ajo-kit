import { compact, intersect } from '@kit/auth/ability'

export { can } from '@kit/auth/ability'

const catalog = {
	tokens: ['read', 'create', 'delete'],
	sessions: ['read', 'delete'],
	profile: ['read', 'update', 'delete'],
	chats: ['read', 'create', 'send'],
	admin: ['read', 'write'],
} as const

type Catalog = typeof catalog
type Resource = keyof Catalog
type Action<R extends Resource> = Catalog[R][number]

export type Ability = {
	[R in Resource]: `${R}:${Action<R>}`
}[Resource]

type Wildcard = `${Resource}:*`

const resources = Object.keys(catalog) as Resource[]
const titled = (value: string) => `${value[0].toUpperCase()}${value.slice(1)}`
const ability = (resource: Resource, action: string) => `${resource}:${action}` as Ability
const wildcard = (resource: Resource) => `${resource}:*` as Wildcard
const bundle = (resources: readonly Resource[]) =>
	resources.flatMap(resource => catalog[resource].map(action => ability(resource, action)))

export const abilities = bundle(resources)

export const groups = resources.map(resource => ({
	label: titled(resource),
	wildcard: wildcard(resource),
	abilities: bundle([resource]),
})) satisfies readonly {
	label: string
	wildcard: Wildcard
	abilities: readonly Ability[]
}[]

export const bundles = {
	admin: ['*'],
	user: bundle(resources.filter(resource => resource !== 'admin')),
} satisfies Record<'admin' | 'user', readonly string[]>

const wildcards = resources.map(wildcard)
const known = new Set<string>(['*', ...abilities, ...wildcards])

/** Projects account grants onto the catalog abilities the account can delegate. */
export const grantable = (abilities: readonly string[] | undefined) =>
	abilities?.includes('*') ? ['*'] : intersect(abilities ?? [], wildcards)

/** Expands a full-access request to the delegable grants; explicit requests pass through. */
export const delegate = (abilities: string[], grantable: readonly string[]) => {
	const requested = normalize(abilities)

	return requested.includes('*') && !grantable.includes('*')
		? [...grantable]
		: requested
}

/** Defaults empty requests to full access and compacts overlapping grants. */
export const normalize = (abilities: string[]) =>
	compact(abilities.length > 0 ? abilities : ['*'])

/** Returns requested abilities that are not in the catalog. */
export const unknown = (abilities: string[]) =>
	abilities.filter(ability => !known.has(ability))
