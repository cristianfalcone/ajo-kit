import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { close, connect, db } from 'ajo-kit/database'
import { up as initial } from '../migrations/0001_initial'
import { up as passkeys } from '../migrations/0002_passkeys'
import { up as teams } from '../migrations/0003_teams'
import { up as invites } from '../migrations/0004_invites'
import { up as integrity } from '../migrations/0005_integrity'
import { configure } from '../src/store'

let directory: string

export async function setup() {
	directory = mkdtempSync(join(tmpdir(), 'ajo-kit-auth-'))
	connect(join(directory, 'test.sqlite'))
	configure(() => db())

	await initial(db<any>())
	await passkeys(db<any>())
	await teams(db<any>())
	await invites(db<any>())
	await integrity(db<any>())
}

export async function teardown() {
	await close()
	rmSync(directory, { recursive: true, force: true })
}
