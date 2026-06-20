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

export const options = abilities.map(value => ({ value, label: value }))

const known = new Set<string>(abilities)

export const normalize = (abilities: string[]) =>
	[...new Set(abilities.length > 0 ? abilities : ['*'])]

export const unknown = (abilities: string[]) =>
	abilities.filter(ability => ability !== '*' && !known.has(ability))
