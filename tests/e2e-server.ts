import { rmSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { hash } from '../packages/ajo-auth/src/password'
import { connect, db, close } from '../packages/ajo-kit/src/database'
import { migrator } from '../packages/ajo-kit/src/migrate'
import { dev, listen } from '../packages/ajo-kit/src/node'

const database = resolve('.tmp/e2e.sqlite')

async function seed() {
	const store = db<any>()
	const password = await hash('password')

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

	await store.insertInto('members').values([
		{ user: cristian.id, role: 1 },
		{ user: emily.id, role: 2 },
	]).execute()

	const chat = await store.insertInto('chats').values({
		name: null,
	}).returning('id').executeTakeFirstOrThrow()

	await store.insertInto('participants').values([
		{ chat: chat.id, user: cristian.id, seen: null },
		{ chat: chat.id, user: emily.id, seen: null },
	]).execute()

	await store.insertInto('messages').values([
		{ chat: chat.id, user: emily.id, text: 'Hello from the e2e seed' },
	]).execute()
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
