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

function parts(ability: string) {
	const [resource, action, extra] = ability.split(':')

	return extra === undefined && resource && action
		? { resource, action }
		: null
}

const wildcarded = (ability: string) => {
	const grant = parts(ability)

	return grant?.action === '*' ? grant.resource : null
}

const matches = (grant: string, ability: string) => {
	if (grant === '*' || grant === ability) return true

	const wildcard = wildcarded(grant)
	const required = parts(ability)

	return !!wildcard && required?.resource === wildcard
}

export const can = (abilities: readonly string[] | undefined, ability: string) =>
	abilities?.some(grant => matches(grant, ability)) ?? false

export const grantable = (abilities: readonly string[] | undefined) => {
	if (abilities?.includes('*')) return ['*']

	return compact(groups.flatMap(group =>
		can(abilities, group.wildcard)
			? [group.wildcard]
			: group.abilities.filter(ability => can(abilities, ability))
	))
}

export const delegate = (abilities: string[], grantable: readonly string[]) => {
	const requested = normalize(abilities)

	return requested.includes('*') && !grantable.includes('*')
		? [...grantable]
		: requested
}

export const normalize = (abilities: string[]) =>
	compact([...new Set(abilities.length > 0 ? abilities : ['*'])])

export const unknown = (abilities: string[]) =>
	abilities.filter(ability => !known.has(ability))

function compact(abilities: string[]) {

	if (abilities.includes('*')) return ['*']

	const broad = new Set(abilities.map(wildcarded).filter(resource => resource !== null))

	return abilities.filter(ability => {
		const resource = wildcarded(ability)
		if (resource) return true

		return !broad.has(parts(ability)?.resource ?? '')
	})
}
