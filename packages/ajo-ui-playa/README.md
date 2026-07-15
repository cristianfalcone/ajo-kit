# ajo-ui-playa

The Playa themed component system for Ajo applications. It ships runtime
families as source and the UnoCSS preset that makes their visual contract
complete.

## Install

```sh
pnpm add ajo ajo-ui-playa
pnpm add -D unocss@66.7.2
```

The peers are Ajo `>= 0.1.35` and exact UnoCSS `66.7.2`. Applications do not
install or import `ajo-ui`; it is a private regular dependency of
`ajo-ui-playa`.

## Build-Time Setup

Activate Playa once in the application's UnoCSS config:

```ts
import { defineConfig } from 'unocss'
import { playa } from 'ajo-ui-playa'

export default defineConfig({
  presets: [playa()],
  shortcuts: {
    // Product-only composition belongs to the app.
    'site-container': 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8',
  },
})
```

Enable the UnoCSS Vite plugin and load `virtual:uno.css`. An `ajo-kit` app does
both through this setup:

```ts
import { kit, jsx } from 'ajo-kit/vite'
import { defineConfig } from 'vite'
import unocss from 'unocss/vite'

export default defineConfig({
  plugins: [...kit({ css: ['virtual:uno.css'] }), unocss()],
  esbuild: jsx,
})
```

The package root is build-time only: it exports `playa()` and no runtime
component barrel. Runtime code imports explicit family subpaths:

```tsx
import Button, { buttonVariants } from 'ajo-ui-playa/button'
import { Card, CardContent } from 'ajo-ui-playa/card'
import { DataTable, type DataTableColumn } from 'ajo-ui-playa/data-table'
```

Each public family has an explicit export-map entry. Private recipes and
cross-family implementation seams have no public subpath. The package is
side-effect-free, so selecting one family does not retain the complete catalog.

## Style Ownership

`playa()` owns Wind4, the Lucide collection, the Playa token theme, preflights,
variants, rules, and component shortcuts. UnoCSS extracts the published family
source that enters the application's Vite graph; consumers do not add a
package-source content glob, a generated component safelist, or an
`optimizeDeps.exclude` workaround.

The preset intentionally contains no product-specific shortcut or icon
safelist. Keep product shortcuts and icon class tokens in application source.
Static tokens are extracted normally; if an app constructs an icon name at
runtime, that app owns the corresponding UnoCSS safelist entry.
