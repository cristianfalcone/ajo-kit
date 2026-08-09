import { describe, expect, test } from 'vitest'
import { descriptor, engine, kit } from '../src/vite'

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

	test('app authority follows the descriptor ordering contract', () => {
		const value = descriptor({
			modules: ['server/entry.js'],
			migrations: [],
			data: false,
			net: false,
			env: {
				required: ['Z_REQUIRED', 'A_REQUIRED'],
				optional: ['Z_OPTIONAL', 'A_OPTIONAL'],
			},
			fs: { roots: ['/proc', '/', '/ajo/data'] },
			ipc: { pipes: ['/ajo/ops/z', '/ajo/ops/a'] },
		})

		expect({ env: value.env, fs: value.fs, ipc: value.ipc }).toEqual({
			env: {
				required: ['NODE_ENV', 'APP_URL', 'A_REQUIRED', 'Z_REQUIRED'],
				optional: ['APP_SECRET', 'DATABASE_PATH', 'TRUST_PROXY', 'AJO_TIMING', 'HOST', 'PORT', 'A_OPTIONAL', 'Z_OPTIONAL'],
			},
			fs: { roots: ['/', '/ajo/data', '/proc'] },
			ipc: { pipes: ['/ajo/ops/a', '/ajo/ops/z'] },
		})
	})
})
