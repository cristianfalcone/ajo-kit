# ajo-ui-playa

## 0.3.0

### Breaking Changes

- Requires `ajo-ui ^0.3.0`. `ajo-cloves` and the Fontsource variable fonts for
  DM Sans, Fraunces and JetBrains Mono are dependencies, and `unocss 66.10.5`
  is an optional peer: the preset and the component families need it, the
  stylesheets do not.
- The tokens follow the system colour scheme: `tokens.css` sets
  `color-scheme: light dark` and writes every colour that changes with the
  scheme with `light-dark()`, so a visitor who prefers dark gets it before any
  script runs. A `light` or `dark` class on the root only forces a choice, and
  Wind4's `dark:` variant matches only the `dark` class. The values are new: an
  ivory suit by day, a warm neutral near-black at night, satin champagne gold
  as the one metal and a navy carpet under code and logs.
- `primary` is the champagne plate. Button's default variant wears it
  (`gilt-plate`), `danger` fills with the new `danger-fill` role, `secondary`
  is enamel with a hairline, `outline` sits at the input boundary and `link` is
  underlined at rest. Link-coloured text is `text-link`, and gold text or icons
  are `text-gold-text`.
- The `edge-on-accent` and `line-on-accent` shortcuts are removed.
- One focus ring: a flush 2 px outline in `--ring` (`playa-focus`), with no
  halo. The invalid and disabled states are `playa-invalid` and
  `playa-disabled`. Native inputs, selects and textareas lose the preflight
  outline and take `playa-field` or `playa-focus`.
- A vertical Field has three rows (title, control and message); the error
  takes the help's line, and only the control boundary and the message turn
  to the danger hue, not the label or the value. Multiple errors drop their
  bullets, FieldSeparator drops its negative margins and placeholders take
  `--faint-foreground`.
- `InputGroupButton` sizes are `default` and `icon` (was `xs`, `sm`,
  `icon-xs` and `icon-sm`); its height follows the group's `size`.
  `SidebarMenuSubButton` drops `size`.
- `ajo-ui-playa/direction` no longer exports `DirectionContext`, which
  `ajo-ui` 0.3.0 removes.
- `AlertDialogCancel` defaults to the secondary variant, and every modal
  footer reads Cancel, then the primary action at the end.
- `rounded-*` derives from `--radius`, and `shadow-lg` and `shadow-xl` from the
  elevation tokens.
- Family rules leave the global preflight: the preset is split by family, and
  an application emits a family's CSS only when it uses that family.

### What Is New

- `ajo-ui-playa/tokens.css` and `ajo-ui-playa/fonts.css`, plain stylesheets
  that need no UnoCSS; `sideEffects` lists `*.css`.
- `FieldRow` shares the field rows across neighbours inside a `FieldGroup` and
  stacks them below the group's 28rem width.
- `InputFile`, a file field in the page's words.
- Control heights `h-control-sm`, `h-control` and `h-control-lg`, taken by
  `size` on Button, Input, InputGroup, Select (with a new `lg`), Toolbar and
  ButtonGroup. Button `loading` keeps its width, sets `aria-busy` and ignores
  activation.
- Materials by utility name: `gilt-plate`, `panel`, `edge`, `edge-input`,
  `glass-chrome`, `glass-overlay`, `scrim`, `navy`, `font-title` and
  `text-title`, with Fraunces for the page title, DM Sans for the interface and
  JetBrains Mono for data.
- Families follow the document's direction and mirror in right-to-left
  layouts; menus, popovers and tooltips share one radius and open with a fade
  and a scale that reduced motion drops.
- The README documents the theme contract, the rules (sizes, fields, states
  and direction) and the materials.

### Upgrade Steps

1. Install `ajo-ui-playa@0.3.0`, which brings `ajo-ui@0.3.0` and
   `ajo-cloves@0.2.1`, and keep `unocss@66.10.5` when you use the preset.
2. Import `ajo-ui-playa/fonts.css`; in an ajo-kit App, from an application
   stylesheet listed in kit's `css` entries before `virtual:uno.css`.
3. Restore a saved theme by adding a `light` or `dark` class to the root before
   the first paint, and style through the tokens instead of `dark:` utilities.
4. Replace `text-primary` link text with `text-link`, and remove
   `edge-on-accent` and `line-on-accent`.
5. Give `InputGroupButton` the `default` or `icon` size, and remove `size`
   from `SidebarMenuSubButton`.
6. Add `playa-field` or `playa-focus` to native form controls outside the
   families.
7. Put fields that share a line in a `FieldRow` inside a `FieldGroup`.

## 0.2.0

### Breaking Changes

- Requires `ajo ^0.2.0`, `ajo-ui ^0.2.0` and exactly `unocss 66.10.5` (was
  66.7.2). `clsx` is no longer a dependency.
- Named exports only: the default exports of `alert`, `aspect-ratio`, `button`,
  `card`, `checkbox`, `chip`, `data-table`, `input`, `label`, `scroll-area`,
  `slider`, `spinner`, `switch`, `textarea`, `toggle` and `virtual-list` are
  removed (`Button` and `Spinner` are now named exports).
- The unused variant recipes `alertVariants`, `buttonGroupVariants`,
  `cardVariants`, `emptyMediaVariants`, `itemVariants`, `markerVariants`,
  `tabsListVariants` and `toggleVariants` are no longer exported.
- `showCloseButton` is removed from DialogContent, DialogFooter, AlertDialog and
  Sidebar. Compose a close control: a bare `<DialogClose />` renders the
  labelled corner X, in a Drawer too.
- Toast is one `toast` (from `ajo-ui/toast`) and one `Toaster`. `Toast`,
  `ToastAction`, `ToastClose`, `ToastTitle`, `ToastDescription`,
  `ToastViewport`, `ToastProvider`, `ToastToaster`, `toastOptions`,
  `updateToast`, `dismissToast`, `clearToasts` and their types are removed.
- The family changes of `ajo-ui` 0.2.0 apply to the themed families: string
  Select and Command values, no Calendar `captionLayout`, `fromYear`, `toYear`
  or `CalendarDayButton`, no InputDate presets or `InputDateTimeField`, no
  Select scroll buttons, no `ChartLegendContent` or `ChartSeries` types, no
  Carousel API types, no `MessageScrollerProvider`, no `DrawerTrigger` or
  `DrawerClose` (use the Dialog parts), no Menubar or ContextMenu item parts
  such as `MenubarItem` and `ContextMenuItem` (use the Menu parts), and no
  `*Args` types for the Drawer parts. The themed `DrawerHeader`, `DrawerFooter`,
  `DrawerTitle`, `DrawerDescription` and `MenubarContent` stay.
- `ItemHeader`, `ItemFooter`, `SidebarRail`, the `SidebarContext` re-export
  (import it from `ajo-ui/sidebar`) and the Typography table parts are removed.

### What Is New

- Every part is built on `part()` from `ajo-ui/utils`: it keeps a caller
  `data-slot` override and merges `class`.
- Carousel uses logical positions and flips its arrows in right-to-left
  layouts, and ToggleGroup arrows follow the direction.

### Upgrade Steps

1. Install `ajo-ui-playa@0.2.0` with `ajo@0.2.0` and `unocss@66.10.5`.
2. Replace default imports with named ones:
   `import { Button } from 'ajo-ui-playa/button'`.
3. Add `<DialogClose />` where DialogContent relied on its built-in close
   button.
4. Render one `<Toaster />` and call `toast()`; update and dismiss through the
   id it returns.
5. Apply the `ajo-ui` 0.2.0 upgrade steps to the families you use.

## 0.1.2

### Patch Changes

- Reuse themed menu parts, shared props, and base scrolling defaults; simplify button recipes without changing styles.
