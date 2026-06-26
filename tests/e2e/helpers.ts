import { createHash, randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { hash } from '../../packages/ajo-auth/src/password'
import { Database } from '../../packages/ajo-kit/src/database'

export const admin = {
	email: 'cristian@example.com',
	password: 'password',
}

export const member = {
	email: 'emily@example.com',
	password: 'password',
}

const database = resolve('.tmp/e2e.sqlite')

export const proof = (base: string) => ({
	Accept: 'application/json',
	Origin: base,
})

export async function login(request: APIRequestContext, base: string, credentials = admin) {
	const response = await request.post('/login?/default', {
		headers: proof(base),
		data: credentials,
	})

	expect(response.status()).toBe(200)

	return response.json()
}

export async function signin(page: Page, credentials = admin) {
	await goto(page, '/login')
	await page.locator('input[name="email"]').fill(credentials.email)
	await page.locator('input[name="password"]').fill(credentials.password)
	await page.getByRole('button', { name: 'Sign In' }).click()
	await expect(page).toHaveURL(/\/dashboard$/)
}

export async function ready(page: Page) {
	await page.locator('html[data-ajo-ready="true"]').waitFor()
}

export async function goto(page: Page, url: string) {
	await page.goto(url)
	await ready(page)
}

export async function make(options: {
	email: string
	password?: string
	name?: string
	role?: 'admin' | 'user'
	verified?: boolean
}) {
	const sqlite = new Database(database)

	try {
		const password = await hash(options.password ?? 'password')
		const created = new Date().toISOString()
		const user = sqlite.prepare(`
			insert into users (name, email, password, verified, created, updated)
			values (?, ?, ?, ?, ?, ?)
		`).run(
			options.name ?? options.email,
			options.email,
			password,
			options.verified === false ? null : created,
			created,
			created,
		)

		const role = sqlite.prepare('select id from roles where name = ?').get(options.role ?? 'user') as { id: number }

		sqlite.prepare('insert into members (user, role) values (?, ?)').run(Number(user.lastInsertRowid), role.id)

		return Number(user.lastInsertRowid)
	} finally {
		sqlite.close()
	}
}

export function reset(user: number, plain: string, expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString()) {
	const sqlite = new Database(database)

	try {
		const id = createHash('sha256').update(plain).digest('hex')

		sqlite.prepare('delete from resets where user = ?').run(user)
		sqlite.prepare('insert into resets (id, user, expiry) values (?, ?, ?)').run(id, user, expiry)
	} finally {
		sqlite.close()
	}
}

export function invite(options: {
	email: string
	name?: string
	token?: string
	expiry?: string
	revoked?: boolean
	accepted?: boolean
}) {
	const plain = options.token ?? `invite-${randomUUID()}`
	const id = createHash('sha256').update(plain).digest('hex')
	const now = new Date().toISOString()
	const expiry = options.expiry ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
	const sqlite = new Database(database)

	try {
		sqlite.prepare(`
			insert into invitations (id, email, name, inviter, expiry, accepted, acceptor, revoked)
			values (?, ?, ?, null, ?, ?, null, ?)
		`).run(
			id,
			options.email.trim().toLowerCase(),
			options.name ?? '',
			expiry,
			options.accepted ? now : null,
			options.revoked ? now : null,
		)

		return plain
	} finally {
		sqlite.close()
	}
}

export function setSignup(signup: 'open' | 'invite') {
	const sqlite = new Database(database)

	try {
		sqlite.prepare(`
			insert into registration (id, signup, updated, updater)
			values (1, ?, ?, null)
			on conflict(id) do update set
				signup = excluded.signup,
				updated = excluded.updated,
				updater = null
		`).run(signup, new Date().toISOString())
	} finally {
		sqlite.close()
	}
}

export function getSignup() {
	const sqlite = new Database(database, { readonly: true })

	try {
		const row = sqlite.prepare('select signup from registration where id = 1').get() as { signup: 'open' | 'invite' }
		return row.signup
	} finally {
		sqlite.close()
	}
}

export function count(table: string, where: string, value: string | number) {
	const sqlite = new Database(database, { readonly: true })

	try {
		const row = sqlite.prepare(`select count(*) as count from ${table} where ${where}`).get(value) as { count: number }
		return row.count
	} finally {
		sqlite.close()
	}
}
