import { spawn, execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const root = fileURLToPath(new URL('../', import.meta.url))
const kit = join(root, 'node_modules/.bin/kit')

export async function start(selected?: number) {
	const directory = await mkdtemp(join(tmpdir(), 'ajo-notes-test-'))
	let port = selected
	if (!port) {
		const socket = createServer()
		await new Promise<void>(resolve => socket.listen(0, '127.0.0.1', resolve))
		const address = socket.address()
		if (!address || typeof address === 'string') throw new Error('No test port')
		port = address.port
		await new Promise<void>((resolve, reject) => socket.close(error => error ? reject(error) : resolve()))
	}
	const url = `http://127.0.0.1:${port}`
	const env = {
		...process.env,
		NODE_ENV: 'development',
		APP_URL: url,
		APP_SECRET: 'local-test-only-notes-secret-000000000000000000',
		DATABASE_PATH: join(directory, 'notes.sqlite'),
	}
	try {
		await promisify(execFile)(kit, ['migrate', 'up', '--database', env.DATABASE_PATH], {
			cwd: root, env, timeout: 30_000,
		})
	} catch (error) {
		await rm(directory, { recursive: true, force: true })
		throw error
	}
	const child = spawn(kit, ['dev', '--port', String(port)], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] })
	let output = ''
	for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => output = (output + chunk).slice(-20_000))
	const exited = new Promise<void>(resolve => child.once('exit', () => resolve()))
	const close = async () => {
		child.kill('SIGTERM')
		await Promise.race([exited, setTimeout(5_000)])
		if (child.exitCode === null && child.signalCode === null) {
			child.kill('SIGKILL')
			await exited
		}
		await rm(directory, { recursive: true, force: true })
	}
	const deadline = Date.now() + 45_000
	while (Date.now() < deadline) {
		if (child.exitCode !== null || child.signalCode !== null) break
		try {
			if ((await fetch(url, { signal: AbortSignal.timeout(1_000) })).ok) return { url, close }
		} catch { /* Wait for this owned development process to listen. */ }
		await setTimeout(100)
	}
	await close()
	throw new Error(`Test server did not become ready:\n${output}`)
}
