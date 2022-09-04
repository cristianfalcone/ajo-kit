/**
 * @type import('vite').UserConfig
 */
const config = {
	esbuild: {
		jsxFactory: 'h',
		jsxFragment: 'Fragment',
		jsxInject: `import { h, Fragment } from 'ajo'`,
	}
}

export default config
