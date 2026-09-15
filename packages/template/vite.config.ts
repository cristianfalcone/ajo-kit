import { defineConfig } from 'vite'
import { kit } from 'ajo-kit/vite'
import unocss from 'unocss/vite'

export default defineConfig({
	// The client entry owns a virtual route graph; keep it in Vite's plugin pipeline.
	optimizeDeps: { exclude: ['ajo-kit/client'] },
	plugins: [...kit({ css: ['virtual:uno.css'], guard: [/\/src\/(database|mail)/] }), unocss()],
})
