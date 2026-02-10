import { defineConfig } from 'vite'
import { kit, jsx } from 'ajo-kit/vite'
import unocss from 'unocss/vite'

export default defineConfig({
	plugins: [...kit({ css: ['virtual:uno.css'] }), unocss()],
	esbuild: jsx,
})
