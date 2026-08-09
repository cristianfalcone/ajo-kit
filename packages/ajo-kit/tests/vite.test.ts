import { describe, expect, test } from 'vitest'
import { engine, kit } from '../src/vite'

describe('ajo-kit vite plugin', () => {
	test('native addons are not rewritten to build-machine paths', () => {
		const plugins = kit()

		expect(plugins.some(plugin => plugin.name === 'ajo-native-external')).toBe(false)
	})

	test('custom guard patterns are added to defaults', async () => {
		const plugin = kit({ guard: [/\/src\/data\//] }).find(plugin => plugin.name === 'ajo-server-only')!
		const hook = plugin.resolveId as { handler: (source: string, importer?: string) => Promise<void> }
		const context = {
			environment: { name: 'client' },
			resolve: async (source: string) => ({ id: source }),
		}

		await expect(hook.handler.call(context, '/project/src/data/store.ts', '/project/src/page.tsx')).rejects.toThrow('Server-only module')
		await expect(hook.handler.call(context, '/project/src/dashboard/handler.ts', '/project/src/page.tsx')).rejects.toThrow('Server-only module')
	})

	test('client-marked modules bypass server-only patterns', async () => {
		const plugin = kit({ guard: [/\/src\/data\//, /ajo-kit-auth\//] }).find(plugin => plugin.name === 'ajo-server-only')!
		const hook = plugin.resolveId as { handler: (source: string, importer?: string) => Promise<void> }
		const context = {
			environment: { name: 'client' },
			resolve: async (source: string) => ({ id: source }),
		}

		await expect(hook.handler.call(context, '/project/node_modules/ajo-kit-auth/src/token.ts', '/project/src/page.tsx')).rejects.toThrow('Server-only module')
		await expect(hook.handler.call(context, '/project/node_modules/ajo-kit-auth/src/ability.client.ts', '/project/src/page.tsx')).resolves.toBeUndefined()
		await expect(hook.handler.call(context, '/project/src/data/dates.client.ts', '/project/src/page.tsx')).resolves.toBeUndefined()
	})

	test('a root bootstrap export declares engine database use', () => {
		const target = engine({ template: '', migrations: [], database: false })
		const transform = target.plugin.transform as (code: string, id: string) => void

		transform('export async function bootstrap() {}', '/project/src/wares.ts')

		expect(target.result.database).toBe(true)
	})
})
