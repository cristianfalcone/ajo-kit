// Teams and tenancy: the fold of teams, teammates and claims, the scoped
// ability resolution, and the admit() guard that composes global and
// team-scoped authority for one subject. The suite runs the real 0003
// migration so the constraints under test are the shipped ones.

import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { db, sql } from 'ajo-kit/database'
import { down, up } from '../migrations/0003_teams'
import { scoped } from '../src/account'
import { admit } from '../src/guard'
import * as team from '../src/team'
import { setup, teardown } from './database.fixture'

beforeEach(async () => {
	await setup()
	await up(db<any>())
})

afterEach(teardown)

const seed = async () => {
	await db<any>().insertInto('users').values([
		{ id: 1, name: 'ada', email: 'ada@example.test' },
		{ id: 2, name: 'grace', email: 'grace@example.test' },
	]).execute()
	await db<any>().insertInto('roles').values([
		{ id: 1, name: 'operator', abilities: '["apps:operate"]' },
		{ id: 2, name: 'viewer', abilities: '["apps:view"]' },
	]).execute()
}

describe('team lifecycle', () => {
	test('create, rename, get, list with counts, and remove cascades', async () => {
		await seed()
		const alpha = await team.create('alpha')
		const beta = await team.create('beta')

		await team.rename(beta, 'bravo')
		const renamed = await team.get(beta)
		expect(renamed?.name).toBe('bravo')
		expect(renamed?.updated).not.toBeNull()

		await team.join(alpha, 1, 1)
		await team.join(alpha, 2, 2)
		await team.claim(alpha, 'app:blog')

		const listed = await team.list()
		expect(listed.map(row => row.name)).toEqual(['alpha', 'bravo'])
		expect(listed[0]).toMatchObject({ teammates: 2, claims: 1 })
		expect(listed[1]).toMatchObject({ teammates: 0, claims: 0 })

		await team.remove(alpha)
		expect(await team.get(alpha)).toBeUndefined()
		const { rows: memberships } = await sql`SELECT count(*) AS n FROM teammates`.execute(db<any>())
		const { rows: holdings } = await sql`SELECT count(*) AS n FROM claims`.execute(db<any>())
		expect(Number((memberships[0] as { n: number }).n)).toBe(0)
		expect(Number((holdings[0] as { n: number }).n)).toBe(0)
	})

	test('a duplicate team name surfaces the unique violation', async () => {
		await team.create('alpha')
		await expect(team.create('alpha')).rejects.toThrow(/UNIQUE/i)
	})

	test('join is one membership per team and user; re-joining changes the role', async () => {
		await seed()
		const alpha = await team.create('alpha')

		await team.join(alpha, 1, 1)
		await team.join(alpha, 1, 2)

		const members = await team.members(alpha)
		expect(members).toHaveLength(1)
		expect(members[0]).toMatchObject({ user: 1, name: 'ada', email: 'ada@example.test', role: 'viewer' })

		await team.leave(alpha, 1)
		expect(await team.members(alpha)).toHaveLength(0)
	})

	test('claims are idempotent, ordered, releasable, and traceable both ways', async () => {
		await seed()
		const alpha = await team.create('alpha')
		const bravo = await team.create('bravo')

		await team.claim(alpha, 'app:shop')
		await team.claim(alpha, 'app:blog')
		await team.claim(alpha, 'app:blog')
		await team.claim(bravo, 'app:blog')

		expect(await team.claims(alpha)).toEqual(['app:blog', 'app:shop'])
		expect((await team.holders('app:blog')).map(holder => holder.name)).toEqual(['alpha', 'bravo'])

		await team.release(alpha, 'app:shop')
		expect(await team.claims(alpha)).toEqual(['app:blog'])

		await team.join(alpha, 1, 1)
		await team.join(bravo, 1, 2)
		expect(await team.of(1)).toEqual([
			{ team: alpha, name: 'alpha', role: 'operator' },
			{ team: bravo, name: 'bravo', role: 'viewer' },
		])
		expect(await team.subjects(1)).toEqual(['app:blog'])
	})
})

describe('scoped abilities', () => {
	test('membership in teams claiming the subject merges their roles', async () => {
		await seed()
		const alpha = await team.create('alpha')
		const bravo = await team.create('bravo')
		await team.claim(alpha, 'app:blog')
		await team.claim(bravo, 'app:blog')
		await team.join(alpha, 1, 1)
		await team.join(bravo, 1, 2)

		expect(await scoped(1, 'app:blog')).toEqual(['apps:operate', 'apps:view'])
	})

	test('a team that does not claim the subject contributes nothing', async () => {
		await seed()
		const alpha = await team.create('alpha')
		await team.claim(alpha, 'app:blog')
		await team.join(alpha, 1, 1)

		expect(await scoped(1, 'app:shop')).toEqual([])
		expect(await scoped(2, 'app:blog')).toEqual([])
	})
})

describe('admit', () => {
	test('global abilities pass any subject without touching teams', async () => {
		const owner = { user: { id: 99, abilities: ['*'] } } as any
		await expect(admit(owner, 'app:anything', 'apps:operate')).resolves.toBeUndefined()
	})

	test('a scoped user passes only for claimed subjects, with the exact refusal', async () => {
		await seed()
		const alpha = await team.create('alpha')
		await team.claim(alpha, 'app:blog')
		await team.join(alpha, 1, 1)

		const developer = { user: { id: 1, abilities: [] } } as any
		await expect(admit(developer, 'app:blog', 'apps:operate')).resolves.toBeUndefined()
		await expect(admit(developer, 'app:shop', 'apps:operate'))
			.rejects.toThrow('Missing ability: apps:operate')
		await expect(admit(developer, 'app:blog', 'apps:view'))
			.rejects.toThrow('Missing ability: apps:view')
	})

	test('unauthenticated requests are denied before any lookup', async () => {
		await expect(admit({} as any, 'app:blog', 'apps:operate')).rejects.toThrow('Authentication required')
	})

	test('a bearer token is never scoped: it must carry the ability itself', async () => {
		await seed()
		const alpha = await team.create('alpha')
		await team.claim(alpha, 'app:blog')
		await team.join(alpha, 1, 1)

		const blocked = {
			user: { id: 1, abilities: [] },
			token: { id: 'token-a', abilities: ['profile:read'] },
		} as any
		await expect(admit(blocked, 'app:blog', 'apps:operate'))
			.rejects.toThrow('Missing ability: apps:operate')

		const carried = {
			user: { id: 1, abilities: [] },
			token: { id: 'token-b', abilities: ['apps:operate'] },
		} as any
		await expect(admit(carried, 'app:blog', 'apps:operate')).resolves.toBeUndefined()
	})
})

describe('migration 0003', () => {
	test('down() leaves no trace of the three tables or their indexes', async () => {
		await down(db<any>())
		const { rows } = await sql`
			SELECT name FROM sqlite_master
			WHERE name LIKE '%team%' OR name LIKE '%claim%'
		`.execute(db<any>())
		expect(rows).toEqual([])
	})
})
