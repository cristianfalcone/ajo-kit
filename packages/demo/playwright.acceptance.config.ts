import { defineConfig as config } from '@playwright/test'
import base from './playwright.config'

export default config({
	...base,
	use: { ...base.use, baseURL: 'http://127.0.0.1:8080' },
	projects: [{ ...base.projects![0], name: 'ajo' }],
	webServer: undefined,
})
