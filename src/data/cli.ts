import sade from 'sade'
import { sql } from 'kysely'
import { db, close } from './db'
import type { NewUser } from './types'

async function fetchJson<T>(url: string): Promise<T> {
	const res = await fetch(url)
	if (!res.ok) throw new Error(`Failed to fetch ${url}`)
	return res.json()
}

export async function migrate(): Promise<void> {

	const k = db()

	await k.schema
		.createTable('users')
		.ifNotExists()
		.addColumn('id', 'integer', c => c.primaryKey())
		.addColumn('username', 'text', c => c.notNull().unique())
		.addColumn('firstName', 'text', c => c.notNull())
		.addColumn('lastName', 'text', c => c.notNull())
		.addColumn('email', 'text', c => c.notNull().unique())
		.addColumn('password', 'text')
		.addColumn('verified', 'integer', c => c.defaultTo(0))
		.addColumn('created', 'text', c => c.defaultTo(sql`CURRENT_TIMESTAMP`))
		.execute()

	await k.schema
		.createTable('sessions')
		.ifNotExists()
		.addColumn('id', 'text', c => c.primaryKey())
		.addColumn('userId', 'integer', c => c.notNull().references('users.id').onDelete('cascade'))
		.addColumn('expiry', 'text', c => c.notNull())
		.addColumn('created', 'text', c => c.defaultTo(sql`CURRENT_TIMESTAMP`))
		.execute()

	await k.schema
		.createTable('roles')
		.ifNotExists()
		.addColumn('id', 'integer', c => c.primaryKey())
		.addColumn('name', 'text', c => c.notNull().unique())
		.execute()

	await k.schema
		.createTable('members')
		.ifNotExists()
		.addColumn('userId', 'integer', c => c.notNull().references('users.id').onDelete('cascade'))
		.addColumn('roleId', 'integer', c => c.notNull().references('roles.id').onDelete('cascade'))
		.execute()
}

export async function rollback(): Promise<void> {
	const k = db()
	await k.schema.dropTable('members').ifExists().execute()
	await k.schema.dropTable('sessions').ifExists().execute()
	await k.schema.dropTable('roles').ifExists().execute()
	await k.schema.dropTable('users').ifExists().execute()
}

export async function seed(): Promise<void> {

	console.log('Seeding database...')

	// Fresh start
	await rollback()
	await migrate()

	const k = db()

	// Fetch users from DummyJSON
	const usersData = await fetchJson<{ users: any[] }>('https://dummyjson.com/users?limit=20')

	// Insert users
	const users: NewUser[] = usersData.users.map(u => ({
		id: u.id,
		username: u.username,
		firstName: u.firstName,
		lastName: u.lastName,
		email: u.email,
	}))

	await k.insertInto('users').values(users).execute()

	console.log(`  ${users.length} users`)

	// Insert default roles
	const roles = [
		{ id: 1, name: 'admin' },
		{ id: 2, name: 'user' },
		{ id: 3, name: 'moderator' },
	]

	await k.insertInto('roles').values(roles).execute()

	console.log(`  ${roles.length} roles`)
	console.log('Done!')
}

const run = (fn: () => Promise<void>) => fn().then(close).catch(error => {
	console.error(error)
	process.exit(1)
})

sade('db')
	.command('seed')
	.describe('Seed database with sample data from DummyJSON')
	.action(() => run(seed))
	.command('migrate')
	.describe('Run database migrations')
	.action(() => run(async () => {
		await migrate()
		console.log('Migrations complete')
	}))
	.command('rollback')
	.describe('Drop all tables')
	.action(() => run(async () => {
		await rollback()
		console.log('Rollback complete')
	}))
	.parse(process.argv)
