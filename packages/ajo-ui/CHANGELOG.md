# ajo-ui

## 0.3.0

### Breaking Changes

- Requires `ajo-cloves ^0.2.1`.
- `DirectionContext` is removed from `ajo-ui/direction`. Direction-aware
  components (Tabs, Toolbar, ToggleGroup, Calendar, Carousel, Menubar,
  NavigationMenu, submenus, Select chips and popup origins) read their
  element's computed direction when a key arrives, so a `dir` on `<html>`
  mirrors them without a provider. `DirectionProvider` only writes `dir` on its
  host, and a component writes `dir` on its root only for an explicit `dir`
  arg.
- A submenu opens toward the inline end: `left-start` (falling back to
  `right-start`) in a right-to-left menu.
- DataTable's facet and column menus no longer repeat their trigger as a label:
  the `menu_label` and `menu_separator` keys of `classNames` are removed.
- Chart: the plot is a group of named marks with one Tab stop. Arrow keys move
  right and left along a series and up and down across series, Home and End
  jump to the ends, and the tooltip closes once focus leaves the marks.
  Without `width` or `height` it draws at the plot's laid-out size and stamps
  `data-measured` once it has drawn at that size. The value axis steps on
  round numbers from zero, the x axis keeps its first and last labels and thins
  the ones between, area fills are painted from the largest area to the
  smallest, and a donut hole takes at most 60 % of the radius.
- Select and InputDate popups open 8 px from their trigger (was 6 px).

### What Is New

- Dialog, and AlertDialog, Drawer and CommandDialog on top of it, return focus
  to their trigger with the focus ring after a keyboard close (Escape, or Enter
  or Space on a close control) and without it after a pointer close.
- CommandList stamps `data-overflow-y` and the DataTable container
  `data-overflow-x` through the `overflow` clove, so a theme can fade the edge
  a long list or a wide table scrolls toward.
- DataTable holds its data columns' header widths while a result is empty, so
  the columns do not jump.
- SidebarTrigger reports `aria-expanded` for the sidebar and for the phone
  drawer.
- InputDate segment groups take their direction from the locale's formatted
  pattern, so `en-US`, `he` and `fa` read left to right on a right-to-left page
  and Arabic keeps its day on the right. Arrow keys move between segments in
  on-screen order; Tab order stays logical.
- NavigationMenu scrolls a list trigger or link into view when it takes
  keyboard focus; focus from a press does not scroll.

### Upgrade Steps

1. Install `ajo-ui@0.3.0` with `ajo-cloves@0.2.1`.
2. Set `dir` and `lang` on `<html>` and keep `DirectionProvider` only for a
   subtree that differs. Replace reads of `DirectionContext` with the element's
   computed `direction`.
3. Remove `menu_label` and `menu_separator` from DataTable `classNames`.

## 0.2.0

### Breaking Changes

- Requires `ajo ^0.2.0` and `ajo-cloves ^0.2.0`.
- The package has no root entry: import each family from its subpath
  (`ajo-ui/tabs`, `ajo-ui/select`, ...). `ajo-ui/data-table` and
  `ajo-ui/virtual-list` have no default export.
- `ajo-ui/utils` keeps `OmitArg`, `FixedArgs`, `part`, `clx`, `bool` and
  `stlx`. `part(type, slot, fixed?)` replaces `withSlot`; the internal helpers
  (`ariaChecked`, `syncCheckedState`, `CheckedState`, `flag`, `text`,
  `strings`, `toNumber`, `matchesTokens`, `resolveFilter`,
  `defaultResultsLabel`, `emptyChildren`, `popupStyle`, `triggerAttrs` and the
  style types) are gone. `PopupPlacement` and `PopupPosition` come from the
  popup family subpaths.
- Select and Command take string values: `value`, `defaultValue` and
  `onValueChange` are `string` or `string[]`, with no generic item type,
  `itemToStringValue` or `null`. Items are composed as children: the root
  `items` arg and the SelectList render function are removed. `showClear` and
  `clearLabel` are removed (compose `SelectClear` inside `SelectInput`), and so
  are the scroll buttons, `SelectChip.showRemove`, `SelectSize` and the
  input-level `value` and `onValueChange` on `SelectInput`, `SelectChipsInput`
  and `CommandInput`.
- Calendar: `captionLayout` and its dropdowns, `fromYear` and `toYear` (use
  `startMonth` and `endMonth`), `dayClassName` and the per-state class args,
  `fixedWeeks`, `showOutsideDays`, `formatters.day` and the public
  `CalendarDayButton` are removed. Day state is on the day button as `data-*`
  attributes, `classNames` names structural parts only, and `locale` is a
  string.
- InputDate: `InputDateTimeField`, `presets` (`InputDatePresets`,
  `InputDatePreset`) and `closeOnSelect` are removed; the popup closes on a
  completed selection, and `timeZone` belongs to InputDateCalendar.
- Toast: `toast(message, options)` returns the toast id; `toast(message,
  { id })` updates it and `toast.dismiss(id)` closes it (no id closes all).
  `ToastProvider`, `ToastController`, `updateToast`, `dismissToast`,
  `clearToasts`, `ToastType`, `ToastInput` and `ToastView` are removed. Outside
  a browser `toast()` only returns an id.
- Dialog drops `onEscapeKeyDown` (handle the Escape keydown and call
  `preventDefault()`), and `CommandDialog` moves to `ajo-ui-playa/command`.
- The Drawer, ContextMenu and Menubar part aliases are removed: compose
  `DialogTrigger`, `DialogClose`, `DialogHeader`, `DialogFooter`,
  `DialogTitle` and `DialogDescription` inside Drawer, and the `Menu` parts from
  `ajo-ui/menu` inside ContextMenu and MenubarMenu. MenubarMenu and
  NavigationMenuItem require their parent.
- Tooltip drops `disableHoverableContent`. Sidebar drops `SidebarInput`,
  `SidebarRail`, `SidebarSeparator`, its cookie and the mobile close button.
- Checkbox and Switch render one native checkbox whose `checked` is the live
  controlled property; the `CheckboxState` type is removed, and
  RadioGroup native inputs carry no `aria-checked` or `data-state`.
- Chart: `series` is `string[]` (labels and colors come from `config`),
  `ChartSeries`, `ChartSeriesInput` and `ChartLegendContent` are removed
  (ChartLegend takes its content as `children`), and the scope id is the
  container `id`.
- MessageScroller is the root of its family: `MessageScrollerProvider` and
  `setApi` are removed; controls read `MessageScrollerContext()`.
- Carousel drops `CarouselApi`, its events and options, `setApi` and `reInit`;
  `scrollTo(index)` is on the context and `loop` is a top-level arg.
- VirtualList `scrollTo(key, options?)` addresses items by key only;
  `VirtualListTarget` is removed.
- DataTable's rows-per-page control is a native `<select>`, and DataTable,
  Calendar and the InputDate family take one `classNames` map for the parts of
  other families they render.
- Accordion drops `AccordionContent.innerClass`; Progress drops
  `indicatorClass` and `getValueLabel`; ToggleGroup drops `size`, `variant` and
  `spacing` (a theme concern).
- A handler that calls `preventDefault()` on an Escape keydown consumes it, and
  no enclosing surface closes.

### What Is New

- `FieldLabel`, `FieldDescription` and `FieldError`; every base control reads
  the Field wiring itself.
- Chart emits its series colors under a `data-chart-scope` selector and drops
  unsafe keys and colors, and its tooltip positions itself.
- Menu submenus, Menubar, NavigationMenu, ToggleGroup and Carousel follow
  `DirectionContext` for arrow keys in right-to-left layouts, as Tabs and
  Toolbar do.
- Calendar compares dates numerically, so ranges and bounds work across years
  below 1000, and InputDate keeps years such as 50 instead of mapping them to
  1950.
- `ajo-ui/data-table` exports `DataTableData` and `DataTableKey`, and
  `ajo-ui/input-date` exports `InputDateClassName`.

### Upgrade Steps

1. Install `ajo-ui@0.2.0` with `ajo@0.2.0`.
2. Replace `import { ... } from 'ajo-ui'` with family subpaths, and default
   imports of DataTable and VirtualList with named ones.
3. Replace `withSlot(Component, 'slot')` with `part(Component, 'slot')`.
4. Map Select and Command items to string keys, render them as children, and
   read labels from `textValue`. Replace `showClear` with a composed
   `SelectClear`.
5. Replace Calendar `fromYear`/`toYear` with `startMonth`/`endMonth`, and
   `dayClassName` or per-state class args with `data-*` selectors on the day
   button.
6. Replace InputDate presets with buttons inside InputDateContent that set a
   controlled `value`.
7. Replace toast controllers and `updateToast` with the id `toast()` returns;
   render one `Toaster`.
8. Replace Drawer, ContextMenu and Menubar part aliases with the Dialog and Menu
   parts.
9. Replace `VirtualList` `scrollTo(index)` with `scrollTo(key)`, and Carousel
   `setApi` with `CarouselContext()`.

## 0.1.2

### Patch Changes

- Simplify menu collections, date reconciliation, charts, and message scrolling while preserving component behavior.
