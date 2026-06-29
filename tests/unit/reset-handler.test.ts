import { createHash } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, test, vi } from 'vitest'

const path = process.env.DATABASE_PATH

const restore = () => {
	if (path === undefined) delete process.env.DATABASE_PATH
	else process.env.DATABASE_PATH = path
}

const close = async () => {
	const database = await import('@kit/database')
	await database.close()
}

afterEach(async () => {
	await close()
	restore()
	vi.doUnmock('@kit/auth')
	vi.resetModules()
})

test('invalid reset tokens fail before password hashing', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'ajo-reset-handler-'))
	const hash = vi.fn(async () => 'hashed-password')

	process.env.DATABASE_PATH = join(dir, 'test.sqlite')

	try {
		vi.doMock('@kit/auth', async () => {
			const auth = await vi.importActual<typeof import('@kit/auth')>('@kit/auth')

			return {
				...auth,
				password: {
					...auth.password,
					hash,
				},
			}
		})
		vi.doMock('@kit/server', () => ({ emit: vi.fn() }))

		const { db } = await import('/src/data')

		await db().schema
			.createTable('resets')
			.addColumn('id', 'text', column => column.primaryKey())
			.addColumn('user', 'integer')
			.addColumn('expiry', 'text')
			.execute()

		await db().insertInto('resets').values({
			id: createHash('sha256').update('expired-token').digest('hex'),
			user: 1,
			expiry: new Date(Date.now() - 1000).toISOString(),
		}).execute()

		const { actions } = await import('../../src/(public)/reset/[token]/handler')

		for (const token of ['missing-token', 'expired-token']) {
			await expect(actions.default({
				params: { token },
				body: {
					password: 'password123',
					confirm: 'password123',
				},
			} as any)).rejects.toMatchObject({
				status: 400,
				message: 'Invalid or expired reset link',
			})
		}

		expect(hash).not.toHaveBeenCalled()
	} finally {
		await close()
		rmSync(dir, { recursive: true, force: true })
	}
})
