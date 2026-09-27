# ajo-ui-playa

Themed Ajo component library and UnoCSS preset.

## Install

```bash
pnpm add ajo ajo-ui-playa
pnpm add -D unocss@66.10.5
```

`ajo-ui-playa` requires `ajo ^0.2.0`. `unocss 66.10.5` is an optional peer:
the preset and the component families need it, the stylesheets do not.

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
import { kit } from 'ajo-kit/vite'
import { defineConfig } from 'vite'
import unocss from 'unocss/vite'

export default defineConfig({
  plugins: [...kit({ css: ['virtual:uno.css'] }), unocss()],
})
```

## Stylesheets

Two plain stylesheets need no UnoCSS. Import them from CSS or JavaScript through
a bundler that resolves package exports, such as Vite:

```css
@import 'ajo-ui-playa/tokens.css';
@import 'ajo-ui-playa/fonts.css';
```

- `ajo-ui-playa/tokens.css` holds Playa's design tokens as custom properties
  (`--background`, `--primary`, `--radius`, ...), with `.dark` on an ancestor
  selecting the dark values. `playa()` emits the same file as its first
  preflight, so a UnoCSS app does not import it again.
- `ajo-ui-playa/fonts.css` is opt-in and loads `DM Sans Variable`,
  `JetBrains Mono Variable` and `Fraunces Variable` (weight axis) from
  Fontsource. Each face declares its unicode ranges, so the browser downloads
  only the subsets a page uses.

## Usage

Import `playa()` from the package root. Import components from family subpaths:

```tsx
import { Button, buttonVariants } from 'ajo-ui-playa/button'
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
