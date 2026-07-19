import { afterEach, expect, test, vi } from 'vitest'

afterEach(() => {
	vi.restoreAllMocks()
	vi.unstubAllGlobals()
})

test('sample seed fetches remote data before deleting local tables', async () => {
	const fetch = vi.fn(async () => ({ ok: false }))
	const db = { deleteFrom: vi.fn() }
	vi.stubGlobal('fetch', fetch)

	const { seed } = await import('../../db/seeds/sample')

	await expect(seed(db as any)).rejects.toThrow('Failed to fetch')
	expect(fetch).toHaveBeenCalledWith('https://dummyjson.com/users?limit=10')
	expect(db.deleteFrom).not.toHaveBeenCalled()
})
