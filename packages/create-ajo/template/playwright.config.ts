import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	testDir: './tests/browser',
	workers: 1,
	timeout: 30_000,
	use: { baseURL: 'http://127.0.0.1:5217', trace: 'retain-on-failure' },
	projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
	webServer: {
		command: 'node tests/serve.ts',
		url: 'http://127.0.0.1:5217',
		reuseExistingServer: false,
		timeout: 60_000,
	},
})
