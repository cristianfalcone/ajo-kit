# ajo-ui-playa

Themed Ajo component library and UnoCSS preset for business and operations
apps: an ivory suit by day, a warm neutral near-black at night, and satin
champagne gold as the one metal.

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

Load the generated stylesheet, and the opt-in fonts, from the application
entry:

```ts
import 'ajo-ui-playa/fonts.css'
import 'virtual:uno.css'
```

### With ajo-kit

`ajo-kit` loads its `css` entries before hydration. Import the fonts from an
application stylesheet, so they resolve from the application:

```css
/* src/app.css */
@import 'ajo-ui-playa/fonts.css';
```

```ts
import { kit } from 'ajo-kit/vite'
import { defineConfig } from 'vite'
import unocss from 'unocss/vite'

export default defineConfig({
  plugins: [...kit({ css: ['/src/app.css', 'virtual:uno.css'] }), unocss()],
})
```

## Stylesheets

Two plain stylesheets need no UnoCSS. Import them from CSS or JavaScript through
a bundler that resolves package exports, such as Vite:

```css
@import 'ajo-ui-playa/tokens.css';
@import 'ajo-ui-playa/fonts.css';
```

- `ajo-ui-playa/tokens.css` holds Playa's materials as custom properties and
  the scheme contract (see Theme), with no element selectors and no network.
  `playa()` emits the same file as its first preflight, so a UnoCSS app does
  not import it again.
- `ajo-ui-playa/fonts.css` is opt-in and loads `DM Sans Variable`,
  `JetBrains Mono Variable` and `Fraunces Variable` (weight axis) from
  Fontsource. Each face declares its unicode ranges, so the browser downloads
  only the faces and subsets a page's text uses. Without it the tokens fall
  back to system faces.

The tokens an app may read by name:

| Group | Custom properties |
|---|---|
| Roles | `--background` and `--foreground`; `--card`, `--popover`, `--primary`, `--secondary` and `--accent`, each with its `-foreground`; `--muted`, `--muted-foreground`, `--faint-foreground`, `--link`, `--gold-text`, `--border`, `--input`, `--ring` |
| Status | `--danger`, `--danger-fill`, `--success`, `--warning`, `--info`, each with its `-foreground`; `--chart-1` to `--chart-5` |
| Gold | `--gold-1` to `--gold-6`, `--gilt`, `--gilt-plate`, `--gilt-plate-edge`, `--gilt-plate-shadow`, `--brush` |
| Frost, carpet and elevation | `--glass-filter`, `--glass-chrome`, `--glass-overlay`, `--scrim`, `--scrim-filter`, `--navy`, `--shadow-xs`, `--shadow-lg`, `--shadow-xl` |
| Type | `--font-display` (Fraunces), `--font-body` (DM Sans), `--font-data` (JetBrains Mono) |
| Geometry and state | `--radius`, `--control-sm`, `--control`, `--control-lg`, `--focus-width`, `--disabled-opacity`, `--field-gap`, `--field-message`, `--ease`, `--duration-state`, `--duration-layer` |

## Theme

The system colour scheme is the default. `tokens.css` sets
`color-scheme: light dark` on the root and writes every colour that changes
with the scheme with `light-dark()`, so a visitor who prefers dark gets the
dark theme before any script runs. A `light` or `dark` class on the root
element only forces a choice.

Playa ships no theme toggle: the application owns the choice. Restore a saved
choice before the first paint with an inline script in the document head:

```html
<script>
  try {
    const theme = localStorage.getItem('theme')
    if (theme === 'light' || theme === 'dark') document.documentElement.classList.add(theme)
  } catch {}
</script>
```

The toggle writes the class and saves it:

```tsx
import { Button } from 'ajo-ui-playa/button'

const toggle = () => {
  const root = document.documentElement
  const dark = root.classList.contains('dark')
    || (!root.classList.contains('light') && matchMedia('(prefers-color-scheme: dark)').matches)
  const next = dark ? 'light' : 'dark'
  root.classList.remove('light', 'dark')
  root.classList.add(next)
  try { localStorage.setItem('theme', next) } catch {}
}

export const ThemeToggle = () => (
  <Button variant="ghost" size="icon" aria-label="Switch theme" set:onclick={toggle}>
    <span aria-hidden="true" class="i-lucide-sun-moon" />
  </Button>
)
```

Style through the tokens, not `dark:` utilities: Wind4's `dark:` variant
matches only the `dark` class, so it misses a visitor whose system prefers dark.

## Usage

Import `playa()` from the package root. Import components from family subpaths:

```tsx
import { Button, buttonVariants } from 'ajo-ui-playa/button'
import { Card, CardContent } from 'ajo-ui-playa/card'
import { DataTable, type DataTableColumn } from 'ajo-ui-playa/data-table'
```

Family subpath imports are side-effect-free and tree-shakeable.

## Rules

Every family follows these rules, and a screen built from them keeps them when
its own layout does too.

### Sizes

- Three control heights: `sm` 32 px, default 36 px and `lg` 40 px, from
  `--control-sm`, `--control` and `--control-lg`. Button, Input, SelectTrigger,
  Toggle, ToggleGroup and InputGroup take them as `size`; Toolbar, ButtonGroup,
  ToggleGroup and InputGroup pass their `size` to every child that sets none, so
  a composed row has one height. Button also has a square `icon-sm`, `icon`
  and `icon-lg` at each height, and `xs` (24 px, with `icon-xs`) as a dense
  inline size off the control scale.
- A custom control uses `h-control`, `h-control-sm` or `h-control-lg`
  (`min-h-` and `size-` work too).
- One text scale on a 4 px grid, one line height per size: `text-xs` 12/16 for
  captions, `text-sm` 14/20 for body text and every control, label and message,
  `text-base` 16/24 for reading and for inputs on phones, `text-xl` 20/28 for
  section headings, and `text-title` 28/36 for the page title (`text-2xl`
  24/32 on phones). `text-lg` and the sizes above `text-2xl` are off the scale.
- Spacing uses the 4 px steps 4, 8, 12, 16, 24, 32 and 48: fields in a group
  sit 24 apart, groups and page sections 32, and the page header 24 above the
  content.
- DM Sans is the interface. Fraunces appears once per page, as its title:
  `TypographyH1` from `ajo-ui-playa/typography` (or `font-title text-2xl
  font-[360] sm:text-title` on the app's own `h1`). JetBrains Mono
  (`font-mono`) is for values a person copies or compares, such as ids,
  versions, tokens and log lines, never for labels.

### Fields

A vertical `Field` is three rows, whatever its children's order: the label,
the control (at least one control tall) and one message line that help text
and the error share. The error takes the help's place, and the help stays in
`aria-describedby`. Pass `invalid` to every field that can show an error, even
as `false`: the field then keeps its message line while valid, so an error
appears without moving anything. A field with neither help nor validation has
no message row.

`FieldError` renders nothing without a message, so it can stay in the markup;
it also takes a validator's `errors` list in place of children.

`FieldRow` puts fields side by side inside a `FieldGroup`. Its fields share
their three rows, so their controls keep one top when only one of them has
help, an error or a label that wraps, and the row stacks when the group is
narrower than 28rem.

```tsx
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldRow } from 'ajo-ui-playa/field'
import { Input } from 'ajo-ui-playa/input'

type Errors = { name?: string; domain?: string }

export const AppFields = ({ errors }: { errors: Errors }) => (
  <FieldGroup>
    <FieldRow>
      <Field name="app-name" invalid={errors.name !== undefined}>
        <FieldLabel>App name</FieldLabel>
        <Input name="name" />
        <FieldError>{errors.name}</FieldError>
      </Field>
      <Field name="app-domain" invalid={errors.domain !== undefined}>
        <FieldLabel>Domain</FieldLabel>
        <Input name="domain" dir="ltr" />
        <FieldDescription>Point its DNS here before the first deploy.</FieldDescription>
        <FieldError>{errors.domain}</FieldError>
      </Field>
    </FieldRow>
  </FieldGroup>
)
```

A checkbox or switch beside its label is a `Field` with
`orientation="horizontal"`. Placeholders take `--faint-foreground`, so a
placeholder never reads as a value.

### States

- Focus is one ring: `--focus-width` of `--ring` (bronze by day, champagne at
  night), flush on the control's boundary with no gap and no halo, in the
  danger hue on an invalid control. A custom control takes the ring from
  `playa-focus`, and a text field from `playa-field`, which includes it. The
  preflight removes the outline from native `input`, `select` and `textarea`,
  so those need one of the two; anything else (a link, `summary`, a custom
  button) takes the ring from the preflight outline.
- Hover changes a colour, the plate's sheen or a link's underline, and adds no
  ring. Invalid is `aria-invalid="true"`: the boundary and the message take the
  danger hue, `FieldError` puts a small alert icon before the message, and the
  label and the value keep theirs.
- Disabled (`disabled` or `aria-disabled="true"`) dims to `--disabled-opacity`
  and takes no pointer. Button `loading` keeps the button's width, shows a
  Spinner, reports `aria-busy` and ignores activation until it clears.
- Gold is scarce. Button's default variant wears the gold plate: give it to
  the one primary action on a screen, and make every other action `secondary`,
  `outline`, `ghost` or `link`, and a destructive one `danger`. Switches,
  checkboxes, radios, slider ranges and progress fill with the text colour;
  gold marks only focus and the selected item of a set (tab, day, current
  item, menu highlight, selected rows).

### Direction

Families follow the document's direction: set `dir` and `lang` on `<html>`,
and use `DirectionProvider` from `ajo-ui-playa/direction` only for a subtree
that differs. Application markup uses logical utilities (`ps`, `pe`, `ms`, `me`,
`start`, `end`, `text-start`, `rounded-s`, `border-s`) and flips icons that
point a direction, such as a chevron or a "next" arrow, with `rtl:-scale-x-100`;
an icon that names an object does not flip.

## Materials

`playa()` names the materials for application markup:

| Utility | Material |
|---|---|
| `gilt-plate` | The champagne plate of the one primary action. Button's default variant already wears it. |
| `panel` | Enamel: the card fill with a 1 px hairline, for a group that carries meaning (a table, a metric, a settings section with its own save). |
| `edge`, `edge-input` | The 1 px hairline, or the 3:1 control boundary, drawn inside the box. |
| `glass-chrome`, `glass-overlay` | Frost for sticky bars, and for layers that float over the page. |
| `scrim` | The tinted, blurred backdrop behind the modal `<dialog>` that wears it. |
| `navy` | The carpet under code and logs; what sits on it takes the dark tokens in both themes. |
| `playa-focus`, `playa-invalid`, `playa-disabled`, `playa-field` | The designed states, and the boundary every text field shares. |
| `font-title`, `font-sans`, `font-mono` | Fraunces, DM Sans and JetBrains Mono. |
| `h-control`, `h-control-sm`, `h-control-lg`, `text-title` | The control heights and the page title size. |

Colour utilities read the roles by name (`bg-card`, `text-muted-foreground`,
`text-faint-foreground`, `text-link`, `text-gold-text`, `bg-accent`,
`bg-danger-fill`, `border-input`, the rest of the Roles row and the status
hues above; chart series are read as `var(--chart-n)`), and `rounded-*` and
`shadow-xs`, `shadow-lg` and `shadow-xl` derive from `--radius` and the
elevation tokens.

## Components

| Group | Family subpaths |
|---|---|
| Actions and status | `alert`, `alert-dialog`, `button`, `button-group`, `chip`, `marker`, `spinner` |
| Content and layout | `aspect-ratio`, `attachment`, `breadcrumb`, `bubble`, `card`, `empty`, `item`, `kbd`, `label`, `pagination`, `scroll-area`, `separator`, `skeleton`, `table`, `typography` |
| Inputs and selection | `checkbox`, `checkbox-group`, `field`, `input`, `input-date`, `input-group`, `input-otp`, `radio-group`, `select`, `slider`, `switch`, `textarea`, `toggle`, `toggle-group` |
| Navigation and overlays | `accordion`, `collapsible`, `command`, `context-menu`, `dialog`, `direction`, `drawer`, `menu`, `menubar`, `navigation-menu`, `popover`, `sidebar`, `tabs`, `toast`, `toolbar`, `tooltip` |
| Data and media | `avatar`, `calendar`, `carousel`, `chart`, `data-table`, `message`, `message-scroller`, `progress`, `resizable`, `virtual-list` |

## UnoCSS Preset

`playa()` configures Wind4, Lucide icons (`i-lucide-*`), Playa's tokens,
preflights, variants, rules, the materials and component shortcuts.

UnoCSS discovers classes from imported component families. Define application
shortcuts in `uno.config.ts` and add dynamically generated icon names to the
application safelist.
