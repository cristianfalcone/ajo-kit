import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { hash } from '../../packages/ajo-auth/src/password'
import { Database } from '../../packages/ajo-kit/src/database'

export const adminCredentials = {
	email: 'cristian@example.com',
	password: 'password',
}

export const userCredentials = {
	email: 'emily@example.com',
	password: 'password',
}

const databasePath = resolve('.tmp/e2e.sqlite')

export const actionHeaders = (baseURL: string) => ({
	Accept: 'application/json',
	Origin: baseURL,
})

export async function loginRequest(request: APIRequestContext, baseURL: string, credentials = adminCredentials) {
	const response = await request.post('/login?/default', {
		headers: actionHeaders(baseURL),
		data: credentials,
	})

	expect(response.status()).toBe(200)

	return response.json()
}

export async function loginPage(page: Page, credentials = adminCredentials) {
	await gotoReady(page, '/login')
	await page.locator('input[name="email"]').fill(credentials.email)
	await page.locator('input[name="password"]').fill(credentials.password)
	await page.getByRole('button', { name: 'Sign In' }).click()
	await expect(page).toHaveURL(/\/dashboard$/)
}

export async function waitForAjo(page: Page) {
	await page.locator('html[data-ajo-ready="true"]').waitFor()
}

export async function gotoReady(page: Page, url: string) {
	await page.goto(url)
	await waitForAjo(page)
}

export async function createUser(options: {
	email: string
	password?: string
	name?: string
	role?: 'admin' | 'user'
	verified?: boolean
}) {
	const sqlite = new Database(databasePath)

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

export function createResetToken(user: number, plain: string, expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString()) {
	const sqlite = new Database(databasePath)

	try {
		const id = createHash('sha256').update(plain).digest('hex')

		sqlite.prepare('delete from resets where user = ?').run(user)
		sqlite.prepare('insert into resets (id, user, expiry) values (?, ?, ?)').run(id, user, expiry)
	} finally {
		sqlite.close()
	}
}

export function rowCount(table: string, where: string, value: string | number) {
	const sqlite = new Database(databasePath, { readonly: true })

	try {
		const row = sqlite.prepare(`select count(*) as count from ${table} where ${where}`).get(value) as { count: number }
		return row.count
	} finally {
		sqlite.close()
	}
}
