import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { emitDescriptor } from '../src/node'
import { graph } from '../src/vite'

const input = { migrations: [], data: false, net: false }

const fixture = async (engine?: unknown) => {
	const app = await mkdtemp(join(tmpdir(), 'ajo-descriptor-'))
	const staging = join(app, '.ajo')
	await mkdir(join(staging, 'server'), { recursive: true })
	await writeFile(join(staging, 'server/entry.js'), '')
	await writeFile(join(app, 'package.json'), JSON.stringify(engine === undefined ? {} : { kit: { engine } }))
	return { app, staging }
}

const rejects = async (engine: unknown, message: string) => {
	const { app, staging } = await fixture(engine)
	try {
		await expect(emitDescriptor(staging, input, app)).rejects.toThrow(message)
	} finally {
		await rm(app, { force: true, recursive: true })
	}
}

describe('ajo engine build contract', () => {
	test('emits the exact ajoc descriptor shape from a staging tree', async () => {
		const { app, staging } = await fixture()
		try {
			await mkdir(join(staging, 'server/chunks'), { recursive: true })
			await mkdir(join(staging, 'server/migrations'), { recursive: true })
			await mkdir(join(staging, 'client'))
			await Promise.all([
				writeFile(join(staging, 'server/chunks/route.js'), ''),
				writeFile(join(staging, 'server/migrations/0001.js'), ''),
			])

			const value = await emitDescriptor(staging, {
				migrations: [{ name: 'project/0001_initial', module: 'server/migrations/0001.js' }],
				data: true,
				net: true,
			}, app)

			expect(value).toEqual({
				schema: 1,
				entry: 'server/entry.js',
				modules: ['server/entry.js', 'server/chunks/route.js', 'server/migrations/0001.js'],
				client: 'client',
				migrations: [{ name: 'project/0001_initial', module: 'server/migrations/0001.js' }],
				env: {
					required: ['NODE_ENV', 'APP_URL'],
					optional: ['APP_SECRET', 'DATABASE_PATH', 'TRUST_PROXY', 'AJO_TIMING', 'HOST', 'PORT'],
				},
				data: { required: true },
				fs: { roots: [] },
				ipc: { pipes: [] },
				capabilities: ['runtime:net'],
			})
			expect(JSON.parse(await readFile(join(staging, 'ajoc.json'), 'utf8'))).toEqual(value)
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
		const { app, staging } = await fixture({
			env: { optional },
			fs: { roots },
			ipc: { pipes },
		})

		try {
			const value = await emitDescriptor(staging, input, app)
			expect({ env: value.env, fs: value.fs, ipc: value.ipc }).toEqual({
				env: {
					required: ['NODE_ENV', 'APP_URL'],
					optional: ['APP_SECRET', 'DATABASE_PATH', 'TRUST_PROXY', 'AJO_TIMING', 'HOST', 'PORT', ...optional],
				},
				fs: { roots },
				ipc: { pipes },
			})
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
			[{ env: { optional: ['APP_SECRET'] } }, 'env.optional[0] duplicates "APP_SECRET"'],
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

	test('keeps staged server chunks inside the frozen Intl profile', async () => {
		const root = await mkdtemp(join(tmpdir(), 'ajo-intl-'))
		try {
			await mkdir(join(root, 'server/chunks'), { recursive: true })
			await Promise.all([
				writeFile(join(root, 'server/entry.js'), "new Intl.DateTimeFormat('en-US')\n"),
				writeFile(join(root, 'server/chunks/route.js'), "new Intl.RelativeTimeFormat('en-US')\n"),
			])

			await expect(emitDescriptor(root, input)).resolves.toMatchObject({
				modules: ['server/entry.js', 'server/chunks/route.js'],
			})

			await writeFile(join(root, 'server/chunks/route.js'), 'const language = navigator.language\n')
			await expect(emitDescriptor(root, input)).rejects.toThrow('server/chunks/route.js: navigator.language')

			await writeFile(join(root, 'server/chunks/route.js'), 'new Intl.NumberFormat()\n')
			await expect(emitDescriptor(root, input)).rejects.toThrow('server/chunks/route.js: Intl.NumberFormat')
		} finally {
			await rm(root, { force: true, recursive: true })
		}
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
})
