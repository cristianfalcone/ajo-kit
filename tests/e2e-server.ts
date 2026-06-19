import { rmSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { hash } from '../packages/ajo-auth/src/password'
import { connect, db, close } from '../packages/ajo-kit/src/database'
import { migrator } from '../packages/ajo-kit/src/migrate'
import { dev, listen } from '../packages/ajo-kit/src/node'

const database = resolve('.tmp/e2e.sqlite')

async function seed() {
	const store = db<any>()
	const password = await hash('password')
	const now = new Date()
	const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString()

	await store.deleteFrom('messages').execute()
	await store.deleteFrom('participants').execute()
	await store.deleteFrom('chats').execute()
	await store.deleteFrom('members').execute()
	await store.deleteFrom('sessions').execute()
	await store.deleteFrom('tokens').execute()
	await store.deleteFrom('resets').execute()
	await store.deleteFrom('roles').execute()
	await store.deleteFrom('users').execute()

	await store.insertInto('roles').values([
		{ id: 1, name: 'admin' },
		{ id: 2, name: 'user' },
	]).execute()

	const cristian = await store.insertInto('users').values({
		name: 'Cristian Falcone',
		email: 'cristian@example.com',
		password,
		verified: new Date().toISOString(),
	}).returning('id').executeTakeFirstOrThrow()

	const emily = await store.insertInto('users').values({
		name: 'Emily Stone',
		email: 'emily@example.com',
		password,
		verified: new Date().toISOString(),
	}).returning('id').executeTakeFirstOrThrow()

	const extraUsers = []

	for (let i = 1; i <= 30; i++) {
		const user = await store.insertInto('users').values({
			name: `Test User ${String(i).padStart(2, '0')}`,
			email: `user${String(i).padStart(2, '0')}@example.com`,
			password,
			verified: new Date().toISOString(),
			created: ago(100 + i),
		}).returning('id').executeTakeFirstOrThrow()

		extraUsers.push(user)
	}

	await store.insertInto('members').values([
		{ user: cristian.id, role: 1 },
		{ user: emily.id, role: 2 },
		...extraUsers.map(user => ({ user: user.id, role: 2 })),
	]).execute()

	await store.insertInto('tokens').values({
		id: createHash('sha256').update('seed-api-token').digest('hex'),
		user: cristian.id,
		name: 'Seed API Token',
		abilities: JSON.stringify(['tokens:read']),
		last: null,
		expiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
	}).execute()

	const chat = await store.insertInto('chats').values({
		name: null,
	}).returning('id').executeTakeFirstOrThrow()

	await store.insertInto('participants').values([
		{ chat: chat.id, user: cristian.id, seen: new Date().toISOString() },
		{ chat: chat.id, user: emily.id, seen: new Date().toISOString() },
	]).execute()

	await store.insertInto('messages').values(Array.from({ length: 12 }, (_, index) => ({
		chat: chat.id,
		user: index % 2 === 0 ? emily.id : cristian.id,
		text: index === 11 ? 'Hello from the e2e seed' : `Seed chat message ${index + 1}`,
		created: ago(24 - index),
	}))).execute()
}

rmSync(database, { force: true })
rmSync(`${database}-shm`, { force: true })
rmSync(`${database}-wal`, { force: true })
mkdirSync(dirname(database), { recursive: true })

connect(database)
await migrator(db()).migrateToLatest()
await seed()
await close()

process.env.DATABASE_PATH = database
process.env.AJO_TIMING = '1'

await listen(await dev(), 5180)

await new Promise(() => {})
