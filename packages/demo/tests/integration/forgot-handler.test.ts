import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { migrate } from '../migrate'

const path = process.env.DATABASE_PATH
let dir: string

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), 'ajo-forgot-handler-'))
	process.env.DATABASE_PATH = join(dir, 'test.sqlite')
	migrate(process.env.DATABASE_PATH)
})

afterEach(async () => {
	const database = await import('ajo-kit/database')
	await database.close()
	rmSync(dir, { recursive: true, force: true })
	if (path === undefined) delete process.env.DATABASE_PATH
	else process.env.DATABASE_PATH = path
	vi.resetModules()
})

test('forgot answers known and unknown emails alike while delivery fails or hangs', async () => {
	const { db } = await import('/src/data')
	const mail = await import('ajo-kit-mail')
	const { actions } = await import('../../src/(public)/forgot/handler')

	await db().insertInto('users').values({ name: 'Known', email: 'known@example.com', password: null }).execute()

	const error = vi.spyOn(console, 'error').mockImplementation(() => {})
	const forgot = (email: string) => actions.default({
		body: { email },
		headers: { host: 'localhost' },
		remoteAddress: '127.0.0.1',
	} as any)
	const answers = async () => [
		await forgot('known@example.com'),
		await forgot('unknown@example.com'),
	]
	const expected = { message: 'If that email exists, we sent a reset link.' }

	const failing = vi.fn(async () => { throw new Error('transport down') })
	mail.configure({ from: 'no-reply@example.com', transport: failing })
	expect(await answers()).toEqual([expected, expected])
	expect(failing).toHaveBeenCalledTimes(1)
	await vi.waitFor(() => expect(error).toHaveBeenCalledWith('Password reset mail failed', expect.any(Error)))

	const hanging = vi.fn(() => new Promise<void>(() => {}))
	mail.configure({ from: 'no-reply@example.com', transport: hanging })
	expect(await answers()).toEqual([expected, expected])
	expect(hanging).toHaveBeenCalledTimes(1)
})
