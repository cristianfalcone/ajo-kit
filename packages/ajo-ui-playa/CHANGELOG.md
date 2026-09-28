# ajo-ui-playa

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
