import type { Kysely } from 'kysely'

async function fetchJson<T>(url: string): Promise<T> {
	const response = await fetch(url)
	if (!response.ok) throw new Error(`Failed to fetch ${url}`)
	return response.json()
}

export async function seed(db: Kysely<any>): Promise<void> {
	// Clear existing data
	await db.deleteFrom('members').execute()
	await db.deleteFrom('sessions').execute()
	await db.deleteFrom('roles').execute()
	await db.deleteFrom('users').execute()

	// Fetch users from DummyJSON
	const data = await fetchJson<{ users: any[] }>('https://dummyjson.com/users?limit=20')

	const users = data.users.map(u => ({
		id: u.id,
		name: `${u.firstName} ${u.lastName}`,
		email: u.email,
	}))

	await db.insertInto('users').values(users).execute()
	console.log(`  ${users.length} users`)

	// Insert default roles
	const roles = [
		{ id: 1, name: 'admin' },
		{ id: 2, name: 'user' },
		{ id: 3, name: 'moderator' },
	]

	await db.insertInto('roles').values(roles).execute()
	console.log(`  ${roles.length} roles`)
}
