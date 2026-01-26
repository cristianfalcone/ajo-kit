import { unlinkSync, existsSync, watch, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type Database from 'better-sqlite3'

interface Config {
	database: Database.Database
	snapshot: (path: string) => Promise<void>
	changes: (path: string) => Promise<void>
	clear: () => Promise<void>
	rotate?: number
	debounce?: number
}

export function push(config: Config) {

	const path = config.database.name
	const walpath = `${path}-wal`
	const interval = config.rotate ?? 6 * 60 * 60 * 1000
	const debounce = config.debounce ?? 1000

	let pending: NodeJS.Timeout | null = null
	let current: Promise<void> | null = null

	config.database.pragma('wal_autocheckpoint = 0')

	async function upload() {

		if (current || !existsSync(walpath)) return

		current = (async () => {
			try {
				const temp = join(tmpdir(), `wal-${Date.now()}.wal`)
				copyFileSync(walpath, temp)
				await config.changes(temp)
				unlinkSync(temp)
				console.log('[sync] uploaded changes')
			} catch (error) {
				console.error('[sync] upload failed:', error)
			} finally {
				current = null
			}
		})()

		await current
	}

	function schedule() {

		if (pending) clearTimeout(pending)

		pending = setTimeout(() => {
			pending = null
			upload()
		}, debounce)
	}

	async function rotate() {
		try {
			config.database.pragma('wal_checkpoint(TRUNCATE)')

			const backup = join(tmpdir(), `snapshot-${Date.now()}.db`)
			await config.database.backup(backup)
			await config.snapshot(backup)
			unlinkSync(backup)

			await config.clear()

			console.log('[sync] rotated snapshot')
		} catch (error) {
			console.error('[sync] rotation failed:', error)
		}
	}

	function start() {

		rotate()

		let watcher: ReturnType<typeof watch> | null = null

		function watchWal() {
			if (existsSync(walpath)) {
				watcher = watch(walpath, () => schedule())
			}
		}

		watchWal()

		let poll: NodeJS.Timeout | null = null
		if (!existsSync(walpath)) {
			poll = setInterval(() => {
				if (existsSync(walpath)) {
					if (poll) clearInterval(poll)
					watchWal()
				}
			}, 5000)
		}

		const rotator = setInterval(rotate, interval)

		return {
			stop: async () => {
				watcher?.close()
				if (poll) clearInterval(poll)
				if (pending) clearTimeout(pending)
				clearInterval(rotator)
				if (current) await current
			},
			rotate,
		}
	}

	async function once() {
		await rotate()
		if (existsSync(walpath)) {
			await upload()
		}
	}

	return { start, rotate, once }
}
