# ajo-ui-playa

Themed Ajo component library and UnoCSS preset.

## Install

```bash
pnpm add ajo ajo-ui-playa
pnpm add -D unocss@66.7.2
```

`ajo-ui-playa` requires `ajo ^0.1.35` and `unocss 66.7.2`.

## UnoCSS Setup

Add `playa()` to the application's UnoCSS config:

```ts
// uno.config.ts
import { playa } from 'ajo-ui-playa'
import { defineConfig } from 'unocss'

export default defineConfig({
  presets: [playa()],
})
```

Add the UnoCSS plugin to the application's Vite config:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import unocss from 'unocss/vite'

export default defineConfig({
  plugins: [unocss()],
})
```

Load the generated stylesheet from the application entry:

```ts
import 'virtual:uno.css'
```

### With ajo-kit

`ajo-kit` can load the stylesheet before hydration:

```ts
import { kit, jsx } from 'ajo-kit/vite'
import { defineConfig } from 'vite'
import unocss from 'unocss/vite'

export default defineConfig({
  plugins: [...kit({ css: ['virtual:uno.css'] }), unocss()],
  esbuild: jsx,
})
```

## Usage

Import `playa()` from the package root. Import components from family subpaths:

```tsx
import Button, { buttonVariants } from 'ajo-ui-playa/button'
import { Card, CardContent } from 'ajo-ui-playa/card'
import { DataTable, type DataTableColumn } from 'ajo-ui-playa/data-table'
```

Family subpath imports are side-effect-free and tree-shakeable.

## Components

| Group | Family subpaths |
|---|---|
| Actions and status | `alert`, `alert-dialog`, `button`, `button-group`, `chip`, `marker`, `spinner` |
| Content and layout | `aspect-ratio`, `attachment`, `breadcrumb`, `bubble`, `card`, `empty`, `item`, `kbd`, `label`, `pagination`, `scroll-area`, `separator`, `skeleton`, `table`, `typography` |
| Inputs and selection | `checkbox`, `checkbox-group`, `field`, `input`, `input-date`, `input-group`, `input-otp`, `radio-group`, `select`, `slider`, `switch`, `textarea`, `toggle`, `toggle-group` |
| Navigation and overlays | `accordion`, `collapsible`, `command`, `context-menu`, `dialog`, `direction`, `drawer`, `menu`, `menubar`, `navigation-menu`, `popover`, `sidebar`, `tabs`, `toast`, `toolbar`, `tooltip` |
| Data and media | `avatar`, `calendar`, `carousel`, `chart`, `data-table`, `message`, `message-scroller`, `progress`, `resizable`, `virtual-list` |

## UnoCSS Preset

`playa()` configures Wind4, Lucide icons, Playa design tokens, preflights,
variants, rules, and component shortcuts.

UnoCSS discovers classes from imported component families. Define application
shortcuts in `uno.config.ts` and add dynamically generated icon names to the
application safelist.
