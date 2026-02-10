import { defineConfig } from 'vite'
import { kit, jsx } from 'ajo-kit/vite'

export default defineConfig({
	plugins: [...kit()],
	esbuild: jsx,
})
