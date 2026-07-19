import { defineConfig } from 'vite'
import { playa } from 'ajo-ui-playa'
import unocss from 'unocss/vite'

export default defineConfig({
	plugins: [unocss({ presets: [playa()] })],
	esbuild: {
		jsx: 'automatic',
		jsxImportSource: 'ajo',
	},
})
