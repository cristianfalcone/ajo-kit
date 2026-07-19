import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { close, connect, db } from 'ajo-kit/database'
import { configure } from '../src/store'

let directory: string

export async function setup() {
	directory = mkdtempSync(join(tmpdir(), 'ajo-kit-auth-'))
	connect(join(directory, 'test.sqlite'))
	configure(() => db())

	await db<any>().schema
		.createTable('users')
		.addColumn('id', 'integer', column => column.primaryKey())
		.addColumn('name', 'text')
		.addColumn('email', 'text')
		.addColumn('password', 'text')
		.addColumn('verified', 'text')
		.execute()
	await db<any>().schema
		.createTable('roles')
		.addColumn('id', 'integer', column => column.primaryKey())
		.addColumn('name', 'text')
		.addColumn('abilities', 'text')
		.execute()
	await db<any>().schema
		.createTable('members')
		.addColumn('user', 'integer')
		.addColumn('role', 'integer')
		.execute()
	await db<any>().schema
		.createTable('sessions')
		.addColumn('id', 'text', column => column.primaryKey())
		.addColumn('user', 'integer')
		.addColumn('expiry', 'text')
		.addColumn('ip', 'text')
		.addColumn('agent', 'text')
		.addColumn('last', 'text')
		.addColumn('created', 'text')
		.execute()
	await db<any>().schema
		.createTable('tokens')
		.addColumn('id', 'text', column => column.primaryKey())
		.addColumn('user', 'integer')
		.addColumn('name', 'text')
		.addColumn('abilities', 'text')
		.addColumn('last', 'text')
		.addColumn('expiry', 'text')
		.execute()
}

export async function teardown() {
	await close()
	rmSync(directory, { recursive: true, force: true })
}
