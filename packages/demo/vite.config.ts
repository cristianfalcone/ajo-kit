import { defineConfig } from 'vite'
import { kit } from 'ajo-kit/vite'
import unocss from 'unocss/vite'
import { fixture } from './tests/e2e/fixture-plugin'

export default defineConfig({
	plugins: [
		...(process.env.AJO_E2E_BUILD === '1' ? [fixture()] : []),
		...kit({ css: ['virtual:uno.css'], guard: [/\/src\/data\//] }),
		unocss(),
	],
})
