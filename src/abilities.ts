export const abilities = [
	'tokens:read',
	'tokens:create',
	'tokens:delete',
	'sessions:read',
	'sessions:delete',
	'profile:read',
	'profile:update',
	'chats:read',
	'chats:create',
	'chats:send',
	'admin:read',
	'admin:write',
] as const

export type Ability = typeof abilities[number]

export const groups = [
	{
		label: 'Tokens',
		wildcard: 'tokens:*',
		abilities: ['tokens:read', 'tokens:create', 'tokens:delete'],
	},
	{
		label: 'Sessions',
		wildcard: 'sessions:*',
		abilities: ['sessions:read', 'sessions:delete'],
	},
	{
		label: 'Profile',
		wildcard: 'profile:*',
		abilities: ['profile:read', 'profile:update'],
	},
	{
		label: 'Chats',
		wildcard: 'chats:*',
		abilities: ['chats:read', 'chats:create', 'chats:send'],
	},
	{
		label: 'Admin',
		wildcard: 'admin:*',
		abilities: ['admin:read', 'admin:write'],
	},
] as const satisfies readonly {
	label: string
	wildcard: `${string}:*`
	abilities: readonly Ability[]
}[]

const wildcards = groups.map(group => group.wildcard)
const known = new Set<string>(['*', ...abilities, ...wildcards])
const wildcarded = (ability: string) => ability.endsWith(':*') ? ability.slice(0, -2) : null

export const normalize = (abilities: string[]) =>
	compact([...new Set(abilities.length > 0 ? abilities : ['*'])])

export const unknown = (abilities: string[]) =>
	abilities.filter(ability => !known.has(ability))

function compact(abilities: string[]) {

	if (abilities.includes('*')) return ['*']

	const resources = new Set(abilities.map(wildcarded).filter(resource => resource !== null))

	return abilities.filter(ability => {
		const resource = wildcarded(ability)
		if (resource) return true

		return !resources.has(ability.split(':')[0])
	})
}
