import { defineConfig, devices } from '@playwright/test'

// The production suite against the ajo engine artifact. No webServer: the
// orchestrator boots `ajo dist/ajo` (fresh data root, APP_URL matching the
// baseURL below) before running this config.
export default defineConfig({
	testDir: './tests/production',
	timeout: 30_000,
	expect: { timeout: 5_000 },
	workers: 1,
	use: {
		baseURL: 'http://127.0.0.1:8080',
		trace: 'on-first-retry',
	},
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
	],
})
