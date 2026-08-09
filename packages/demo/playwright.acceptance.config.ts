import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	testDir: './tests/e2e',
	globalSetup: './tests/e2e/global-setup.ts',
	timeout: 30_000,
	expect: { timeout: 5_000 },
	workers: 1,
	use: { trace: 'on-first-retry' },
	projects: [
		{
			name: 'node',
			use: {
				...devices['Desktop Chrome'],
				baseURL: 'http://127.0.0.1:5181',
			},
		},
		{
			name: 'ajo',
			use: {
				...devices['Desktop Chrome'],
				baseURL: 'http://127.0.0.1:8080',
			},
		},
	],
	webServer: {
		command: 'pnpm exec tsx tests/acceptance-node-server.ts',
		url: 'http://127.0.0.1:5181/login',
		reuseExistingServer: false,
		timeout: 120_000,
	},
})
