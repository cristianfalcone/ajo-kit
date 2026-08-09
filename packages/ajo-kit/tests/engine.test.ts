import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { Bootstrap } from '../src'
import type { StartOptions } from '../src/engine'

const state = vi.hoisted(() => ({
	database: { name: 'database' },
	events: [] as string[],
	shutdown: undefined as (() => void) | undefined,
}))

vi.mock('runtime:app', () => ({
	default: {
		env: (name: string) => ({
			APP_URL: 'https://example.test',
			DATABASE_PATH: ':memory:',
			NODE_ENV: 'production',
		}[name]),
		onShutdown: (callback: () => void) => { state.shutdown = callback },
		root: '/app',
	},
}))

vi.mock('runtime:http', () => ({
	files: () => {
		state.events.push('files')
		return () => null
	},
	serve: () => {
		state.events.push('listen')
		return { close: vi.fn() }
	},
}))

vi.mock('ajo-kit/database', () => ({
	close: vi.fn(async () => { state.events.push('close') }),
	connect: vi.fn(() => { state.events.push('connect') }),
	db: vi.fn(() => state.database),
}))

vi.mock('../src/migrations', () => ({
	migrator: () => ({
		migrateToLatest: async () => {
			state.events.push('migrate')
			return {}
		},
	}),
}))

vi.mock('../src/server', () => ({
	closeLive: vi.fn(),
	create: vi.fn(async () => {
		state.events.push('create')
		return vi.fn()
	}),
}))

const migration = {
	name: 'project/0001_initial',
	migration: { up: async () => {}, down: async () => {} },
}

const input = (root?: () => Promise<Record<string, unknown>>): StartOptions => ({
	template: '<!-- ssr:root -->',
	registries: {
		routes: {},
		handlers: {},
		wares: root ? { '/src/wares.ts': root } : {},
	},
	migrations: [migration],
	options: { auth: false, database: true },
})

describe('ajo engine bootstrap', () => {
	beforeEach(() => {
		state.events.length = 0
		state.shutdown = undefined
	})

	test('awaits the hook after migration and before create and listen', async () => {
		const { start } = await import('../src/engine')
		const hook = vi.fn(async () => {
			state.events.push('hook:start')
			await Promise.resolve()
			state.events.push('hook:end')
		})

		await start(input(async () => ({ bootstrap: hook })))

		expect(state.events).toEqual(['connect', 'migrate', 'hook:start', 'hook:end', 'create', 'files', 'listen'])
	})

	test('passes the connected database and validated launcher config', async () => {
		const { start } = await import('../src/engine')
		const received = vi.fn()
		const hook: Bootstrap = async context => { received(context) }

		await start(input(async () => ({ bootstrap: hook })))

		expect(received).toHaveBeenCalledWith({
			db: state.database,
			config: {
				database: ':memory:',
				host: '0.0.0.0',
				port: 8080,
			},
		})
	})

	test('aborts boot and closes the database when the hook fails', async () => {
		const { start } = await import('../src/engine')
		const failure = new Error('bootstrap failed')

		await expect(start(input(async () => ({
			bootstrap: async () => {
				state.events.push('hook')
				throw failure
			},
		})))).rejects.toBe(failure)

		expect(state.events).toEqual(['connect', 'migrate', 'hook', 'close'])
	})

	test('treats an absent root hook as a no-op', async () => {
		const { start } = await import('../src/engine')

		await start(input(async () => ({ default: [] })))

		expect(state.events).toEqual(['connect', 'migrate', 'create', 'files', 'listen'])
	})
})
