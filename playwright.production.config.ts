import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	testDir: './tests/production',
	timeout: 30_000,
	expect: { timeout: 5_000 },
	workers: 1,
	use: {
		baseURL: 'http://127.0.0.1:5181',
		trace: 'on-first-retry',
	},
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
	],
	webServer: {
		command: 'pnpm exec tsx tests/production-server.ts',
		url: 'http://127.0.0.1:5181/login',
		reuseExistingServer: false,
		timeout: 120_000,
	},
})
