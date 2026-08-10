import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Request, Response } from '@kit'
import { afterEach, expect, test, vi } from 'vitest'

const path = process.env.DATABASE_PATH
const request = (method: string, body?: unknown): Request => ({
	method,
	target: '/',
	originalUrl: '/',
	path: '/',
	query: {},
	params: {},
	headers: {},
	read: async () => new Uint8Array(),
	body,
})

afterEach(async () => {
	const database = await import('@kit/database')
	await database.close()
	if (path === undefined) delete process.env.DATABASE_PATH
	else process.env.DATABASE_PATH = path
	vi.resetModules()
})

test('the notes loader and action share a typed durable live-update path', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'ajo-template-'))
	process.env.DATABASE_PATH = join(dir, 'test.sqlite')

	try {
		const [{ up }, { db }, { bootstrap }, { actions, page }] = await Promise.all([
			import('../db/migrations/0001_notes'),
			import('../src/database'),
			import('../src/wares'),
			import('../src/handler'),
		])
		const config = { database: process.env.DATABASE_PATH, host: '127.0.0.1', port: 8080 }

		await up(db())
		await bootstrap({ db: db(), config })
		await bootstrap({ db: db(), config })

		const track = vi.fn()
		const load = request('GET')
		load.track = track
		const initial = await page(load)
		expect(initial.notes).toHaveLength(1)
		expect(track).toHaveBeenCalledWith('notes')

		const emit = vi.fn()
		const result = await actions.add(
			request('POST', { text: 'Test the complete slice.' }),
			undefined as unknown as Response,
			{ emit },
		)

		expect(result.note.text).toBe('Test the complete slice.')
		expect(emit).toHaveBeenCalledWith('notes')
		expect((await page(load)).notes.map(note => note.text)).toEqual([
			'Test the complete slice.',
			'Follow the data from loader to live update.',
		])
	} finally {
		const database = await import('@kit/database')
		await database.close()
		rmSync(dir, { recursive: true, force: true })
	}
}, 30_000)
