import { expect, request, test as base } from '@playwright/test'
import { FixtureClient } from './fixture-client'

export { expect, request }
export type { Page } from '@playwright/test'

/** Playwright test extended with the current project's fixture control client. */
export const test = base.extend<{ fixture: FixtureClient }>({
	fixture: async ({ baseURL }, use) => {
		if (!baseURL) throw new Error('The fixture client requires a project baseURL')
		await use(new FixtureClient(baseURL))
	},
})
