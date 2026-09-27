import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { Bootstrap } from '../src'
import type { StartOptions } from '../src/engine'

const state = vi.hoisted(() => ({
	database: { name: 'database' },
	events: [] as string[],
	shutdown: undefined as (() => void) | undefined,
	receive: undefined as ((raw: any) => Promise<any>) | undefined,
	listen: undefined as unknown,
	files: vi.fn(),
	wares: {} as Record<string, () => Promise<Record<string, unknown>>>,
	environment: {
		APP_URL: 'https://example.test',
		DATABASE_PATH: ':memory:',
		NODE_ENV: 'production',
	} as Record<string, string | undefined>,
}))

vi.mock('runtime:app', () => ({
	default: {
		env: (name: string) => state.environment[name],
		onShutdown: (callback: () => void) => { state.shutdown = callback },
		root: '/app',
	},
}))

vi.mock('runtime:http', () => ({
	files: () => {
		state.events.push('files')
		state.files()
		return (raw: any) => raw.target === '/asset'
			? { status: 200, headers: { 'cache-control': 'max-age=60' }, body: 'asset' }
			: null
	},
	serve: (options: unknown, receive: (raw: any) => Promise<any>) => {
		state.events.push('listen')
		state.listen = options
		state.receive = receive
		return { close: vi.fn() }
	},
}))

vi.mock('virtual:ajo/handlers', () => ({ handlers: {}, wares: state.wares }))

vi.mock('ajo-kit/database', () => ({
	close: vi.fn(async () => { state.events.push('close') }),
	db: vi.fn(() => {
		if (!state.events.includes('connect')) state.events.push('connect')
		return state.database
	}),
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

// The root wares module the engine reads the bootstrap hook from.
const input = (root?: () => Promise<Record<string, unknown>>): StartOptions => {
	for (const key of Object.keys(state.wares)) delete state.wares[key]
	if (root) state.wares['/src/wares.ts'] = root
	return {
		template: '<!-- ssr:root -->',
		migrations: [migration],
		options: { database: true },
	}
}

const raw = (host: string) => ({
	method: 'GET',
	target: '/asset',
	headers: { host },
	remoteAddress: '127.0.0.1',
	body: async () => new Uint8Array(),
})

describe('ajo engine bootstrap', () => {
	beforeEach(() => {
		state.events.length = 0
		state.shutdown = undefined
		state.receive = undefined
		state.environment = { APP_URL: 'https://example.test', DATABASE_PATH: ':memory:', NODE_ENV: 'production' }
		state.files.mockReset()
	})

	afterEach(() => {
		vi.unstubAllEnvs()
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

	test('passes the connected database and listens on HOST and PORT', async () => {
		const { start } = await import('../src/engine')
		const received = vi.fn()
		const hook: Bootstrap = async context => { received(context) }

		await start(input(async () => ({ bootstrap: hook })))

		expect(received).toHaveBeenCalledWith({ db: state.database })
		expect(state.listen).toEqual({ host: '0.0.0.0', port: 8080 })

		Object.assign(state.environment, { HOST: '::1', PORT: '65535' })
		await start(input())
		expect(state.listen).toEqual({ host: '::1', port: 65535 })
	})

	test('refuses to start outside production or without an HTTP(S) APP_URL', async () => {
		const { start } = await import('../src/engine')
		for (const [environment, message] of [
			[{ NODE_ENV: 'development' }, 'NODE_ENV must be "production"'],
			[{ APP_URL: undefined }, 'APP_URL must be an absolute HTTP(S) URL'],
			[{ APP_URL: 'example.test' }, 'APP_URL must be an absolute HTTP(S) URL'],
			[{ APP_URL: 'file:///tmp/app' }, 'APP_URL must be an absolute HTTP(S) URL'],
		] as const) {
			Object.assign(state.environment, { APP_URL: 'https://example.test', NODE_ENV: 'production' }, environment)
			await expect(start(input())).rejects.toThrow(message)
		}
		expect(state.events).toEqual([])
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

	test('closes the database when binding the listener fails', async () => {
		const { start } = await import('../src/engine')
		const failure = new Error('client root missing')
		state.files.mockImplementation(() => { throw failure })

		await expect(start(input())).rejects.toBe(failure)

		expect(state.events).toEqual(['connect', 'migrate', 'create', 'files', 'close'])
	})

	test('treats an absent root hook as a no-op', async () => {
		const { start } = await import('../src/engine')

		await start(input(async () => ({ default: [] })))

		expect(state.events).toEqual(['connect', 'migrate', 'create', 'files', 'listen'])
	})

	test('rejects an unknown Host before assets or route handlers', async () => {
		vi.stubEnv('NODE_ENV', 'production')
		vi.stubEnv('APP_URL', 'https://example.test')
		const { start } = await import('../src/engine')
		await start(input(async () => ({ default: [] })))
		const response = await state.receive!(raw('evil.test'))
		expect(response.status).toBe(421)
		expect(response.body).toBe('Misdirected Request')
		expect(response.headers['x-content-type-options']).toBe('nosniff')
	})

	test('admits manifest Hosts through the reader the generated entry passes', async () => {
		vi.stubEnv('NODE_ENV', 'production')
		vi.stubEnv('APP_URL', 'https://example.test')
		vi.stubEnv('AJO_ORIGINS_FILE', '/ajo/origin/origins.json')
		const { start } = await import('../src/engine')
		await start({
			...input(async () => ({ default: [] })),
			origins: () => JSON.stringify({ schema: 'ajo.origins/v1', origins: ['https://example.test', 'https://alias.test'] }),
		})

		const response = await state.receive!(raw('alias.test'))
		expect(response.status).toBe(200)
		expect(response.headers).toMatchObject({
			'cache-control': 'max-age=60',
			'x-content-type-options': 'nosniff',
			'strict-transport-security': 'max-age=31536000; includeSubDomains',
		})
		expect(response.headers).not.toHaveProperty('x-ajo-origins')
		expect((await state.receive!(raw('other.test'))).status).toBe(421)

		await start(input(async () => ({ default: [] })))
		const log = vi.spyOn(console, 'error').mockImplementation(() => {})
		expect((await state.receive!(raw('alias.test'))).status).toBe(500)
		expect(log).toHaveBeenCalledWith('[security] Invalid origin manifest')
	})

})
