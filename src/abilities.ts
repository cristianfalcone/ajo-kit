export const apiAbilities = [
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

export const apiAbilityOptions = apiAbilities.map(value => ({ value, label: value }))

const knownApiAbilities = new Set<string>(apiAbilities)

export const normalizeApiAbilities = (abilities: string[]) =>
	[...new Set(abilities.length > 0 ? abilities : ['*'])]

export const unknownApiAbilities = (abilities: string[]) =>
	abilities.filter(ability => ability !== '*' && !knownApiAbilities.has(ability))
