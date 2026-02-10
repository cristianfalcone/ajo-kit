import type { Kysely } from 'ajo-kit/database'
import { hash } from 'ajo-auth/password'

async function fetchJson<T>(url: string): Promise<T> {
	const response = await fetch(url)
	if (!response.ok) throw new Error(`Failed to fetch ${url}`)
	return response.json()
}

export async function seed(db: Kysely<any>): Promise<void> {

	// Clear existing data
	await db.deleteFrom('members').execute()
	await db.deleteFrom('sessions').execute()
	await db.deleteFrom('tokens').execute()
	await db.deleteFrom('resets').execute()
	await db.deleteFrom('roles').execute()
	await db.deleteFrom('users').execute()

	// Insert roles
	const roles = [
		{ id: 1, name: 'admin' },
		{ id: 2, name: 'user' },
	]

	await db.insertInto('roles').values(roles).execute()
	console.log(`  ${roles.length} roles`)

	// Insert admin user (cristian)
	const password = await hash('password')

	const { id: adminId } = await db.insertInto('users').values({
		name: 'Cristian Falcone',
		email: 'cristian@example.com',
		password,
		verified: new Date().toISOString(),
	}).returning('id').executeTakeFirstOrThrow()

	await db.insertInto('members').values({ user: adminId, role: 1 }).execute()
	console.log(`  1 admin (cristian@example.com)`)

	// Fetch sample users from DummyJSON
	const data = await fetchJson<{ users: any[] }>('https://dummyjson.com/users?limit=10')

	for (const u of data.users) {
		const { id } = await db.insertInto('users').values({
			name: `${u.firstName} ${u.lastName}`,
			email: u.email,
			password,
		}).returning('id').executeTakeFirstOrThrow()

		await db.insertInto('members').values({ user: id, role: 2 }).execute()
	}

	console.log(`  ${data.users.length} users`)
}
