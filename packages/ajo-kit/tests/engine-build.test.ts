import { access, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { appEngine, descriptor, graph } from '../src/build'
import { discover } from '../src/discover'
import { build } from '../src/node'

type Emitted = Pick<Parameters<typeof descriptor>[0], 'modules' | 'migrations' | 'data'>

const emit = async (app: string, input: Emitted = { modules: ['server/entry.js'], migrations: [], data: false }) =>
	descriptor({ ...input, ...await appEngine(app) })

const fixture = async (engine?: unknown) => {
	const app = await mkdtemp(join(tmpdir(), 'ajo-descriptor-'))
	await writeFile(join(app, 'package.json'), JSON.stringify(engine === undefined ? {} : { kit: { engine } }))
	return app
}

const install = async (app: string, name: string, engine?: unknown, declared = true) => {
	const location = join(app, 'node_modules', name)
	await mkdir(location, { recursive: true })
	await writeFile(join(location, 'package.json'), JSON.stringify({ name, kit: { engine } }))
	if (declared) {
		const manifest = JSON.parse(await readFile(join(app, 'package.json'), 'utf8'))
		manifest.devDependencies = { ...manifest.devDependencies, [name]: '1.0.0' }
		await writeFile(join(app, 'package.json'), JSON.stringify(manifest))
	}
}

const rejects = async (engine: unknown, message: string) => {
	const app = await fixture(engine)
	try {
		await expect(emit(app)).rejects.toThrow(message)
	} finally {
		await rm(app, { force: true, recursive: true })
	}
}

describe('ajo engine build contract', () => {
	test('assembles the exact compiler descriptor shape from an emitted graph', async () => {
		const app = await fixture({ net: true })
		try {
			const value = await emit(app, {
				modules: ['server/migrations/0001.js', 'server/entry.js', 'server/chunks/route.js'],
				migrations: [{ name: 'project/0001_initial', module: 'server/migrations/0001.js' }],
				data: true,
			})

			expect(value).toEqual({
				schema: 1,
				entry: 'server/entry.js',
				modules: ['server/entry.js', 'server/chunks/route.js', 'server/migrations/0001.js'],
				client: 'client',
				migrations: [{ name: 'project/0001_initial', module: 'server/migrations/0001.js' }],
				env: {
					required: ['NODE_ENV', 'APP_URL'],
					optional: ['DATABASE_PATH', 'TRUST_PROXY', 'AJO_TIMING', 'HOST', 'PORT'],
				},
				data: { required: true },
				fs: { roots: [] },
				ipc: { pipes: [] },
				capabilities: ['runtime:net'],
			})
		} finally {
			await rm(app, { force: true, recursive: true })
		}
	})

	test('declares runtime:net only for kit.engine.net, including the mail package\'s own declaration', async () => {
		const app = await fixture()
		try {
			expect((await emit(app)).capabilities).toEqual([])
			await writeFile(join(app, 'package.json'), JSON.stringify({ kit: { engine: { net: false } } }))
			expect((await emit(app)).capabilities).toEqual([])
			await rejects({ net: 'yes' }, 'package.json#kit.engine.net must be a boolean')

			const mail = JSON.parse(await readFile(new URL('../../ajo-kit-mail/package.json', import.meta.url), 'utf8'))
			await install(app, 'ajo-kit-mail', mail.kit.engine)
			expect((await emit(app)).capabilities).toEqual(['runtime:net'])
		} finally {
			await rm(app, { force: true, recursive: true })
		}
	})

	test('emits the admin application authority declared in package.json', async () => {
		const optional = [
			'AJO_APPS_FILE',
			'AJO_BACKUP_RECEIPT',
			'AJO_CERTS_FILE',
			'AJO_DATA_FILE',
			'AJO_IMAGES_FILE',
			'AJO_LOGS_DIR',
			'AJO_MAIL_FILE',
			'AJO_OPS_FIFO',
			'AJO_OPS_RESULT',
			'AJO_ORIGINS',
			'AJO_PORTS_FILE',
			'AJO_PREVIEWS_FILE',
			'AJO_RP_ID',
			'AJO_SECURITY_FILE',
			'AJO_STATE_FILE',
			'AJO_TICK_MS',
		]
		const roots = ['/ajo/data', '/ajo/logs', '/ajo/ops', '/ajo/state', '/proc']
		const pipes = ['/ajo/ops/requests']
		const app = await fixture({
			env: { optional },
			fs: { roots },
			ipc: { pipes },
		})

		try {
			const value = await emit(app)
			expect({ env: value.env, fs: value.fs, ipc: value.ipc }).toEqual({
				env: {
					required: ['NODE_ENV', 'APP_URL'],
					optional: ['DATABASE_PATH', 'TRUST_PROXY', 'AJO_TIMING', 'HOST', 'PORT', ...optional],
				},
				fs: { roots },
				ipc: { pipes },
			})
		} finally {
			await rm(app, { force: true, recursive: true })
		}
	})

	test('installed deployment plugins contribute their engine authority from devDependencies', async () => {
		const app = await fixture({ fs: { roots: ['/ajo/data'] } })
		try {
			await install(app, 'ajo-kit-server', {
				env: { optional: ['AJO_ORIGINS_FILE'] },
				fs: { roots: ['/ajo/origin'] },
			})
			const value = await emit(app)
			expect(value.env.optional).toContain('AJO_ORIGINS_FILE')
			expect(value.fs.roots).toEqual(['/ajo/data', '/ajo/origin'])
		} finally {
			await rm(app, { force: true, recursive: true })
		}
	})

	test('ignores installed plugins that the application did not explicitly declare', async () => {
		const app = await fixture()
		try {
			await install(app, 'ajo-shadow', { fs: { roots: ['/ajo/shadow'] } }, false)
			const value = await emit(app)
			expect(value.fs.roots).not.toContain('/ajo/shadow')
			expect(discover(app)).toEqual([])
		} finally {
			await rm(app, { force: true, recursive: true })
		}
	})

	test('rejects a declared plugin whose installed package identity is spoofed', async () => {
		const app = await fixture()
		try {
			await install(app, 'ajo-example', { fs: { roots: ['/ajo/example'] } })
			await writeFile(join(app, 'node_modules/ajo-example/package.json'), JSON.stringify({
				name: 'ajo-spoofed',
				kit: { name: 'ajo-spoofed', path: '/tmp/spoofed', engine: { fs: { roots: ['/ajo/example'] } } },
			}))
			await expect(emit(app)).rejects.toThrow(
				'Plugin package identity mismatch: expected "ajo-example"',
			)
		} finally {
			await rm(app, { force: true, recursive: true })
		}
	})

	test('derives plugin name and path instead of accepting kit field overrides', async () => {
		const app = await fixture()
		try {
			await install(app, 'ajo-example')
			await writeFile(join(app, 'node_modules/ajo-example/package.json'), JSON.stringify({
				name: 'ajo-example',
				kit: { name: 'ajo-spoofed', path: '/tmp/spoofed' },
			}))
			expect(discover(app)).toEqual([expect.objectContaining({
				name: 'ajo-example',
				path: join(app, 'node_modules/ajo-example'),
			})])
		} finally {
			await rm(app, { force: true, recursive: true })
		}
	})

	test('plugins without engine metadata leave the application descriptor unchanged', async () => {
		const app = await fixture()
		try {
			const before = await emit(app)
			await install(app, 'ajo-example')
			expect(await emit(app)).toEqual(before)
			expect(before.fs.roots).toEqual([])
			expect(before.env.optional).not.toContain('AJO_ORIGINS_FILE')
		} finally {
			await rm(app, { force: true, recursive: true })
		}
	})

	test('an App depending on ajo-kit-auth requires APP_SECRET', async () => {
		const app = await fixture()
		try {
			const auth = JSON.parse(await readFile(new URL('../../ajo-kit-auth/package.json', import.meta.url), 'utf8'))
			await install(app, 'ajo-kit-auth', auth.kit.engine)
			const value = await emit(app)
			expect(value.env.required).toEqual(['NODE_ENV', 'APP_URL', 'APP_SECRET'])
			expect(value.env.optional).not.toContain('APP_SECRET')
		} finally {
			await rm(app, { force: true, recursive: true })
		}
	})

	test('merges shared authority once, promotes required variables, and sorts contributions', async () => {
		const app = await fixture({
			env: { optional: ['SHARED', 'APP_OPTIONAL'] },
			fs: { roots: ['/ajo/data'] },
			ipc: { pipes: ['/ajo/shared'] },
		})
		try {
			await install(app, 'ajo-zeta', {
				env: { required: ['SHARED'], optional: ['Z_OPTIONAL'] },
				fs: { roots: ['/ajo/origin', '/ajo/data'] },
				ipc: { pipes: ['/ajo/zeta', '/ajo/shared'] },
			})
			await install(app, 'ajo-alpha', {
				env: { required: ['A_REQUIRED'], optional: ['APP_OPTIONAL', 'SHARED'] },
				fs: { roots: ['/ajo/origin'] },
			})
			const value = await emit(app)
			expect(value.env.required).toEqual(['NODE_ENV', 'APP_URL', 'A_REQUIRED', 'SHARED'])
			expect(value.env.optional).toEqual([
				'DATABASE_PATH', 'TRUST_PROXY', 'AJO_TIMING', 'HOST', 'PORT', 'APP_OPTIONAL', 'Z_OPTIONAL',
			])
			expect(value.fs.roots).toEqual(['/ajo/data', '/ajo/origin'])
			expect(value.ipc.pipes).toEqual(['/ajo/shared', '/ajo/zeta'])
		} finally {
			await rm(app, { force: true, recursive: true })
		}
	})

	test('rejects malformed plugin declarations before merging and names the plugin', async () => {
		const app = await fixture()
		try {
			for (const [engine, message] of [
				[null, 'must be an object'],
				[{ unknown: true }, 'unknown key'],
				[{ env: { optional: ['APP_URL'] } }, 'duplicates "APP_URL"'],
				[{ env: { optional: ['invalid-name'] } }, 'invalid environment name'],
				[{ fs: { roots: ['/ajo/origin', '/ajo/origin'] } }, 'duplicates "/ajo/origin"'],
				[{ fs: { roots: ['relative'] } }, 'absolute normalized POSIX path'],
			] as const) {
				await install(app, 'ajo-example', engine)
				await expect(emit(app)).rejects.toThrow('ajo-example:')
				await expect(emit(app)).rejects.toThrow(message)
			}
		} finally {
			await rm(app, { force: true, recursive: true })
		}
	})

	test('rejects unknown engine keys at every declared object', async () => {
		for (const [engine, message] of [
			[{ unknown: true }, 'package.json#kit.engine has unknown key "unknown"'],
			[{ env: { unknown: [] } }, 'package.json#kit.engine.env has unknown key "unknown"'],
			[{ fs: { roots: [], unknown: [] } }, 'package.json#kit.engine.fs has unknown key "unknown"'],
			[{ ipc: { pipes: [], unknown: [] } }, 'package.json#kit.engine.ipc has unknown key "unknown"'],
		] as const) await rejects(engine, message)
	})

	test('rejects malformed objects, lists, and entries', async () => {
		for (const [engine, message] of [
			[null, 'package.json#kit.engine must be an object'],
			[{ env: [] }, 'package.json#kit.engine.env must be an object'],
			[{ fs: [] }, 'package.json#kit.engine.fs must be an object'],
			[{ ipc: [] }, 'package.json#kit.engine.ipc must be an object'],
			[{ env: { required: {} } }, 'package.json#kit.engine.env.required must be an array'],
			[{ env: { optional: [1] } }, 'package.json#kit.engine.env.optional[0] must be a non-empty string'],
			[{ fs: {} }, 'package.json#kit.engine.fs.roots must be an array'],
			[{ fs: { roots: [''] } }, 'package.json#kit.engine.fs.roots[0] must be a non-empty string'],
			[{ ipc: {} }, 'package.json#kit.engine.ipc.pipes must be an array'],
			[{ ipc: { pipes: [false] } }, 'package.json#kit.engine.ipc.pipes[0] must be a non-empty string'],
		] as const) await rejects(engine, message)
	})

	test('rejects duplicate authority entries and environment collisions', async () => {
		for (const [engine, message] of [
			[{ env: { required: ['AJO_NAME', 'AJO_NAME'] } }, 'env.required[1] duplicates "AJO_NAME"'],
			[{ env: { required: ['NODE_ENV'] } }, 'env.required[0] duplicates "NODE_ENV"'],
			[{ env: { required: ['PORT'] } }, 'env.required[0] duplicates "PORT"'],
			[{ env: { optional: ['DATABASE_PATH'] } }, 'env.optional[0] duplicates "DATABASE_PATH"'],
			[{ env: { optional: ['APP_URL'] } }, 'env.optional[0] duplicates "APP_URL"'],
			[{ env: { required: ['AJO_NAME'], optional: ['AJO_NAME'] } }, 'env.optional[0] duplicates "AJO_NAME"'],
			[{ fs: { roots: ['/ajo', '/ajo'] } }, 'fs.roots[1] duplicates "/ajo"'],
			[{ ipc: { pipes: ['/ajo/pipe', '/ajo/pipe'] } }, 'ipc.pipes[1] duplicates "/ajo/pipe"'],
		] as const) await rejects(engine, message)
	})

	test('rejects invalid environment names', async () => {
		for (const name of ['ajo_name', '1AJO', 'AJO-NAME']) {
			await rejects(
				{ env: { optional: [name] } },
				`package.json#kit.engine.env.optional[0] has invalid environment name "${name}"`,
			)
		}
	})

	test('rejects non-normalized or non-POSIX roots and pipes', async () => {
		for (const path of ['ajo/data', '/ajo\\data', '/ajo/./data', '/ajo/../data', '/ajo/data/', '/ajo//data']) {
			await rejects(
				{ fs: { roots: [path] } },
				`package.json#kit.engine.fs.roots[0] must be an absolute normalized POSIX path: "${path}"`,
			)
		}
		await rejects(
			{ ipc: { pipes: ['ajo/requests'] } },
			'package.json#kit.engine.ipc.pipes[0] must be an absolute normalized POSIX path: "ajo/requests"',
		)
	})

	test('classifies only imports forbidden in a closed engine graph', () => {
		const importer = 'server/entry.js'
		const findings = graph([
			{ importer, kind: 'static', literal: true, specifier: './chunks/route.js' },
			{ importer, kind: 'static', literal: true, specifier: 'runtime:http' },
			{ importer, kind: 'dynamic', literal: true, specifier: '../chunks/lazy.js' },
			{ importer, kind: 'dynamic', literal: false },
			{ importer, kind: 'static', literal: true, specifier: 'node:crypto' },
			{ importer, kind: 'static', literal: true, specifier: 'kysely' },
			{ importer, kind: 'static', literal: true, specifier: './route.tsx' },
			{ importer, kind: 'static', literal: true, specifier: './theme.css' },
		])

		expect(findings.map(finding => finding.type)).toEqual(['dynamic', 'node', 'bare', 'typescript', 'css'])
		expect(findings.every(finding => finding.message.includes(importer))).toBe(true)
	})

	test('fences the SMTP subpath and detects forced Node socket imports', async () => {
		const manifest = JSON.parse(await readFile(
			new URL('../../ajo-kit-mail/package.json', import.meta.url),
			'utf8',
		)) as { exports: Record<string, { ajo?: unknown }> }

		expect(manifest.exports['./smtp']?.ajo).toBeNull()
		expect(graph([
			{ importer: 'server/smtp.js', kind: 'static', literal: true, specifier: 'node:net' },
			{ importer: 'server/smtp.js', kind: 'static', literal: true, specifier: 'node:tls' },
		]).map(finding => finding.type)).toEqual(['node', 'node'])
	})

	test('builds an App whose server code mentions navigator.language and Intl.NumberFormat in strings', async () => {
		const kit = fileURLToPath(new URL('..', import.meta.url))
		const app = await mkdtemp(join(tmpdir(), 'ajo-build-'))
		const cwd = process.cwd()
		try {
			await mkdir(join(app, 'src'))
			await mkdir(join(app, 'node_modules'))
			await Promise.all([
				symlink(kit, join(app, 'node_modules/ajo-kit'), 'dir'),
				writeFile(join(app, 'package.json'), JSON.stringify({ type: 'module', kit: { engine: { net: true } } })),
				// Vite bundles a config import outside node_modules, as it does a workspace link.
				writeFile(join(app, 'vite.config.js'), `import { kit } from ${JSON.stringify(join(kit, 'src/vite.ts'))}\nexport default { plugins: kit() }\n`),
				writeFile(join(app, 'index.html'), '<!doctype html><html><head><!-- ssr:head --></head><body><!-- ssr:data --><div id="root"><!-- ssr:root --></div><script src="/src/client" type="module"></script></body></html>'),
				writeFile(join(app, 'src/page.ts'), "export default function Page() { return 'Reads navigator.language and Intl.NumberFormat only in prose' }\n"),
				writeFile(join(app, 'src/handler.ts'), "import { db } from 'ajo-kit/database'\nexport const GET = () => db()\n"),
			])

			process.chdir(app)
			await build()

			const value = JSON.parse(await readFile(join(app, '.ajo/compiler.json'), 'utf8'))
			expect(value).toMatchObject({ data: { required: true }, capabilities: ['runtime:net'], migrations: [] })
			expect(value.modules[0]).toBe('server/entry.js')
			await Promise.all(value.modules.map((module: string) => access(join(app, '.ajo', module))))
			const code = await Promise.all(value.modules.map((module: string) => readFile(join(app, '.ajo', module), 'utf8')))
			expect(code.join('\n')).toContain('navigator.language and Intl.NumberFormat')
		} finally {
			process.chdir(cwd)
			await rm(app, { force: true, recursive: true })
		}
	}, 60_000)
})
