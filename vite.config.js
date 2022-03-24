/**
 * @type import('vite').UserConfig
 */
const config = {
  esbuild: {
    jsxFactory: 'createElement',
    jsxFragment: 'Fragment',
    jsxInject: `import { createElement, Fragment } from 'ajo'`,
  }
}

export default config
