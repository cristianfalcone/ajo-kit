import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	testDir: './tests/e2e',
	timeout: 30_000,
	expect: { timeout: 5_000 },
	use: {
		baseURL: 'http://127.0.0.1:5180',
		trace: 'on-first-retry',
	},
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
	],
	webServer: {
		command: 'pnpm exec tsx tests/e2e-server.ts',
		url: 'http://127.0.0.1:5180/login',
		reuseExistingServer: false,
		timeout: 120_000,
	},
})
