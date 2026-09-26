# ajo-ui

Unstyled, accessible component families for Ajo applications.

Components provide semantic markup, ARIA relationships, keyboard behavior,
stable styling hooks, and controlled or uncontrolled state. Use them directly
to build an application UI or a reusable theme.

## Install

```bash
pnpm add ajo ajo-ui
```

`ajo-ui` requires `ajo ^0.1.35`.

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
import { bool, part, stlx } from 'ajo-ui/utils'
import type { FixedArgs, OmitArg } from 'ajo-ui/utils'
```

| Export | Role |
|---|---|
| `OmitArg` | Removes named properties while preserving Ajo's open argument index |
| `FixedArgs` | Marks properties supplied by an adapter as unavailable to callers |
| `part` | Builds a part from a tag or component: a default `data-slot` the caller may override, fixed attributes, merged `class` |
| `bool` | Parses boolean-ish attribute input (`true`, `''`, `'true'`) |
| `stlx` | Joins declaration strings and property objects into an inline style |

Popup families export `PopupPlacement` and `PopupPosition` next to the
components that take `placement` and `gap`.

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
state attributes. Apply visual styles through `class`, family class maps such
as the `classNames` of Calendar and the InputDate family, and state attributes
(Calendar stamps day state on its day button).

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

## Localization and Direction

User-visible and assistive-technology strings have English defaults and
component args for replacement.

Calendar and the InputDate family take a BCP 47 `locale`. Without one they use
`<html lang>`, then `en-US`, never the machine locale, so server and browser
render the same text.

`DirectionProvider` supplies the default text direction. Components with
horizontal keyboard navigation also accept a `dir` override.

Component-family subpaths and root imports are side-effect-free and
tree-shakeable.
