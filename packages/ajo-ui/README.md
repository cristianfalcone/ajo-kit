# ajo-ui

Unstyled, accessible component families for Ajo applications.

Components provide semantic markup, ARIA relationships, keyboard behavior,
stable styling hooks, and controlled or uncontrolled state. Use them directly
to build an application UI or a reusable theme.

## Install

```bash
pnpm add ajo ajo-ui
```

`ajo-ui` requires `ajo ^0.2.0`.

The package is authored in TypeScript and ships generated `.d.ts`
declarations for every component-family subpath and `ajo-ui/utils`. Published
runtime and type entrypoints resolve from `dist/`; implementation source is
not required in an installed package.

## Usage

Import each component family from its subpath; the package has no root entry:

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'ajo-ui/tabs'

export default () => (
  <Tabs defaultValue="overview">
    <TabsList aria-label="Project">
      <TabsTrigger value="overview">Overview</TabsTrigger>
      <TabsTrigger value="activity">Activity</TabsTrigger>
    </TabsList>

    <TabsContent value="overview">Project overview</TabsContent>
    <TabsContent value="activity">Recent activity</TabsContent>
  </Tabs>
)
```

## Components

| Group | Family subpaths |
|---|---|
| Foundations | `direction`, `field`, `input-group` |
| Disclosure and layout | `accordion`, `collapsible`, `dialog`, `drawer`, `resizable`, `sidebar` |
| Navigation and menus | `command`, `context-menu`, `menu`, `menubar`, `navigation-menu`, `tabs`, `toolbar` |
| Inputs and selection | `calendar`, `checkbox`, `checkbox-group`, `input-date`, `input-otp`, `radio-group`, `select`, `slider`, `switch`, `toggle`, `toggle-group` |
| Overlays and feedback | `popover`, `progress`, `toast`, `tooltip` |
| Data and display | `avatar`, `carousel`, `chart`, `data-table`, `message-scroller`, `virtual-list` |

## Component Utilities

`ajo-ui/utils` provides the helpers for custom components, themes, and
adapters:

```tsx
import { bool, clx, part, stlx } from 'ajo-ui/utils'
import type { FixedArgs, OmitArg } from 'ajo-ui/utils'
```

| Export | Role |
|---|---|
| `OmitArg` | Removes named properties while preserving Ajo's open argument index |
| `FixedArgs` | Marks properties supplied by an adapter as unavailable to callers |
| `part` | Builds a part from a tag or component: a default `data-slot` the caller may override, fixed attributes, merged `class` |
| `clx` | Joins string class names, skipping booleans and empty values; `undefined` when none remain |
| `bool` | Parses boolean-ish attribute input (`true`, `''`, `'true'`) |
| `stlx` | Joins declaration strings and property objects into an inline style |

The types of the `placement` and `gap` args, `PopupPlacement` and
`PopupPosition`, come from `ajo-ui/popover`, `ajo-ui/tooltip`, `ajo-ui/menu`,
`ajo-ui/menubar`, `ajo-ui/navigation-menu`, `ajo-ui/select` and
`ajo-ui/input-date`.

## Fields

`Field` connects one label, description, and error message to the control
composed inside it. `FieldLabel`, `FieldDescription`, and `FieldError` render
those parts. Checkbox, Switch, InputOTP, SelectTrigger, SelectInput,
InputGroupInput, InputGroupTextarea, Slider, and the InputDate family take the
field's id and ARIA wiring themselves; CheckboxGroup, RadioGroup, a
multi-thumb Slider, and InputDate ranges become the labelled group. Arguments
passed to a control win over the field's. Custom controls spread
`controlAttrs`, `buttonAttrs`, or `groupAttrs` from `FieldContext()`.

## Styling

Components render semantic elements, ARIA attributes, `data-slot` markers, and
state attributes, and no visual styles. One rule themes them:

- Every part takes `class` for the element it renders.
- Nodes a caller does not compose, such as `[data-slot="command-input-icon"]`
  or `[data-slot="menu-item-indicator"]`, are styled through their `data-slot`
  and state attributes.
- Calendar, the InputDate family and DataTable render parts of other families,
  so each also takes one `classNames` map keyed by part name. Calendar day
  state is on its day button as `data-*` attributes.

The native-input controls also take class args for their inner nodes, which
carry `data-slot` too: `inputClass` on Checkbox, Switch, RadioGroupItem,
Slider and InputOTP; `indicatorClass` on Checkbox and RadioGroupItem;
`thumbClass` on Switch and Slider; `trackClass` and `rangeClass` on Slider;
`caretClass` and `caretMarkClass` on InputOTPSlot. `mobileClass` replaces
`class` on Sidebar's mobile drawer panel.

A theme rule keyed on a state attribute, such as `[data-side="right"]`, is
more specific than a plain class on the same element. Override it under the
same selector.

Boolean state attributes use `data-x="true"` when active. Common
`data-state` values include `open`, `closed`, `checked`, `unchecked`,
`active`, `inactive`, `on`, and `off`.

## State

Controlled and uncontrolled families use matching prop groups:

- `value`, `defaultValue`, `onValueChange(value, event)`
- `open`, `defaultOpen`, `onOpenChange(open, event)`
- `checked`, `defaultChecked`, `onCheckedChange(checked, event)`

Escape closes the innermost open surface. A handler that calls
`preventDefault()` on the Escape keydown consumes it, and no enclosing surface
closes.

When Select closes itself while focus is in its list, focus returns to the
trigger or the field input. A close from a controlled parent leaves focus to
the browser's native popover handling.

When a Dialog or a Drawer closes itself, focus returns to its `DialogTrigger`:
with the focus ring after a keyboard close (Escape, or Enter or Space on a close
control), without it after a pointer close.

`MessageScroller` is the root of its family and takes `autoScroll`,
`defaultScrollPosition`, `preserveScrollOnPrepend`, `scrollPreviousItemPeek` and
`onVisibilityChange(visibility)`, called when the visible message ids or the
current anchor change.
Controls that drive it render inside the root and read the controller
(`scrollToEnd`, `scrollToMessage`, `scrollToStart`, `scrollable`,
`visibility`) from `MessageScrollerContext()`.

## Localization and Direction

User-visible and assistive-technology strings have English defaults and
component args for replacement.

Calendar and the InputDate family take a BCP 47 `locale`. Without one they use
`<html lang>`, then `en-US`, never the machine locale, so server and browser
render the same text.

Direction-aware components read their element's resolved direction when a
key arrives, so a document-level `dir` works alone and `DirectionProvider`
only writes `dir` on a subtree. They write `dir` on their root only when given
an explicit `dir` override. Each date and time segment group takes its
locale's direction: `9:30 AM` stays left to right on a right-to-left page, and
an Arabic date keeps its day on the right. Segments are inline spans, so a
theme that keeps them inline gets the browser's bidi order. Every numeric
segment is a left-to-right embed (`direction: ltr` with `unicode-bidi: embed`,
inline), and in a right-to-left group a literal with a space (the date and time
joiner) ends in a right-to-left mark, so an Arabic or Persian value keeps one
on-screen order while its units fill or empty. Arrow keys move between
segments in on-screen order.

Component-family subpaths are side-effect-free and tree-shakeable.
