import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { db } from 'ajo-kit/database'
import * as token from '../src/token'
import { hash } from '../src/session'
import { setup, teardown } from './database.fixture'

beforeEach(async () => {
	await setup()
	await db<any>().insertInto('users').values([
		{ id: 1, email: 'notes@example.test' },
		{ id: 2, email: 'root@example.test' },
	]).execute()
	await db<any>().insertInto('roles').values([
		{ id: 1, name: 'notes', abilities: '["notes:*"]' },
		{ id: 2, name: 'root', abilities: '["*"]' },
	]).execute()
	await db<any>().insertInto('members').values([
		{ user: 1, role: 1 },
		{ user: 2, role: 2 },
	]).execute()
})

afterEach(teardown)

describe('API token authority', () => {
	test('minting uses current global grants and names the first uncovered ability', async () => {
		const plain = await token.create(1, 'Notes', ['notes:read'])
		await expect(token.validate(plain)).resolves.toMatchObject({
			user: 1,
			abilities: ['notes:read'],
		})

		await expect(token.create(1, 'Escalated', ['notes:write', 'tokens:*']))
			.rejects.toThrow('Requested ability exceeds account authority: tokens:*')
		await expect(token.create(2, 'Root', ['tokens:*', 'notes:read'])).resolves.toEqual(expect.any(String))

		await db<any>().updateTable('roles').set({ abilities: '[]' }).where('id', '=', 1).execute()

		await expect(token.create(1, 'Stale', ['notes:read']))
			.rejects.toThrow('Requested ability exceeds account authority: notes:read')
	})

	test('malformed stored abilities resolve to null without throwing or gaining authority', async () => {
		const malformed = [
			['not-json', 'not-json'],
			['object', '{"ability":"notes:read"}'],
			['mixed', '["notes:read",1]'],
		] as const

		await db<any>().insertInto('tokens').values(malformed.map(([plain, abilities]) => ({
			id: hash(plain),
			user: 1,
			name: plain,
			abilities,
			last: null,
			expiry: null,
		}))).execute()

		for (const [plain] of malformed) {
			await expect(token.validate(plain)).resolves.toBeNull()
		}

		expect(await db<any>().selectFrom('tokens').select('last').execute())
			.toEqual([{ last: null }, { last: null }, { last: null }])
	})
})
