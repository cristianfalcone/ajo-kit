import { expect, type APIRequestContext, type Page } from '@playwright/test'
import type {
	CountQuery,
	FixtureClient,
	InvitationInput,
	MakeUserInput,
	Signup,
} from './fixture-client'

export const admin = {
	email: 'cristian@example.com',
	password: 'password',
}

export const member = {
	email: 'emily@example.com',
	password: 'password',
}

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

export const make = (fixture: FixtureClient, input: MakeUserInput) => fixture.makeUser(input)

export const reset = async (fixture: FixtureClient, user: number, token: string, expiry?: string) => {
	await fixture.putReset({ user, token, ...(expiry && { expiry }) })
}

export const invite = (fixture: FixtureClient, input: InvitationInput) => fixture.putInvitation(input)

export const setSignup = async (fixture: FixtureClient, signup: Signup) => {
	await fixture.setRegistration(signup)
}

export const getSignup = (fixture: FixtureClient) => fixture.getRegistration()

type CountArguments = CountQuery extends infer Query
	? Query extends CountQuery
		? [table: Query['table'], where: Query['where'], value: Query['value']]
		: never
	: never

export const count = (fixture: FixtureClient, ...[table, where, value]: CountArguments) =>
	fixture.count({ table, where, value } as CountQuery)
