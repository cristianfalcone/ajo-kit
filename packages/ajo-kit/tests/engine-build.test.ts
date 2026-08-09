import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { emitDescriptor } from '../src/node'
import { graph } from '../src/vite'

describe('ajo engine build contract', () => {
	test('emits the exact ajoc descriptor shape from a staging tree', async () => {
		const root = await mkdtemp(join(tmpdir(), 'ajo-descriptor-'))
		try {
			await mkdir(join(root, 'server/chunks'), { recursive: true })
			await mkdir(join(root, 'server/migrations'), { recursive: true })
			await mkdir(join(root, 'client'))
			await Promise.all([
				writeFile(join(root, 'server/entry.js'), ''),
				writeFile(join(root, 'server/chunks/route.js'), ''),
				writeFile(join(root, 'server/migrations/0001.js'), ''),
			])

			const value = await emitDescriptor(root, {
				migrations: [{ name: 'project/0001_initial', module: 'server/migrations/0001.js' }],
				data: true,
				net: true,
			})

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
				capabilities: ['runtime:net'],
			})
			expect(JSON.parse(await readFile(join(root, 'ajoc.json'), 'utf8'))).toEqual(value)
		} finally {
			await rm(root, { force: true, recursive: true })
		}
	})

	test('keeps staged server chunks inside the frozen Intl profile', async () => {
		const root = await mkdtemp(join(tmpdir(), 'ajo-intl-'))
		try {
			await mkdir(join(root, 'server/chunks'), { recursive: true })
			await Promise.all([
				writeFile(join(root, 'server/entry.js'), "new Intl.DateTimeFormat('en-US')\n"),
				writeFile(join(root, 'server/chunks/route.js'), "new Intl.RelativeTimeFormat('en-US')\n"),
			])

			const input = { migrations: [], data: false, net: false }
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
