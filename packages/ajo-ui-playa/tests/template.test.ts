import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

const template = fileURLToPath(new URL('../../template/', import.meta.url))
const read = (file: string) => readFileSync(`${template}${file}`, 'utf8')
const execute = promisify(execFile)

test('the application template consumes Playa without knowing its base implementation', () => {
	const metadata = JSON.parse(read('package.json')) as {
		dependencies: Record<string, string>
		devDependencies: Record<string, string>
	}
	const uno = read('uno.config.ts')
	const vite = read('vite.config.ts')
	const page = read('src/page.tsx')

	expect(metadata.dependencies['ajo-ui-playa']).toBe('^0.1.0')
	expect(metadata.dependencies).not.toHaveProperty('ajo-ui')
	expect(metadata.devDependencies.unocss).toBe('66.7.2')
	expect(uno).toContain("import { playa } from 'ajo-ui-playa'")
	expect(uno).toContain('presets: [playa()]')
	expect(vite).toContain("css: ['virtual:uno.css']")
	expect(vite).toContain('unocss()')
	expect(page).toContain("from 'ajo-ui-playa/button'")
	expect(page).toContain("from 'ajo-ui-playa/card'")
	expect(page).not.toMatch(/from ['"]ajo-ui-playa['"]/)
})

test('the application template builds through its public package setup', async () => {
	const cli = process.env.npm_execpath
	expect(cli).toBeTruthy()
	await execute(process.execPath, [cli!, '--dir', template, 'build'], {
		cwd: template,
		env: { ...process.env, CI: '1', NO_COLOR: '1' },
		maxBuffer: 4 * 1024 * 1024,
	})
}, 30_000)
