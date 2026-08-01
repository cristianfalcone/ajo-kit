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
declarations for the root and every component-family subpath. Published
runtime and type entrypoints resolve from `dist/`; implementation source is
not required in an installed package.

## Usage

Import a component family from its subpath:

```tsx
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from 'ajo-ui/accordion'
import { Popover, PopoverContent, PopoverTrigger } from 'ajo-ui/popover'
```

The package root exports every component family:

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'ajo-ui'
```

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

`ajo-ui/utils` provides helpers and types for custom components, themes, and
adapters:

```tsx
import {
  ariaChecked,
  bool,
  clx,
  flag,
  popupStyle,
  stlx,
  text,
  triggerAttrs,
  withSlot,
} from 'ajo-ui/utils'
import type {
  CheckedState,
  FixedArgs,
  OmitArg,
  PopupPlacement,
  PopupPosition,
  StyleInput,
  StyleObject,
  StyleValue,
} from 'ajo-ui/utils'
```

| Area | Exports |
|---|---|
| Popup composition | `PopupPlacement`, `PopupPosition`, `triggerAttrs`, `popupStyle` |
| Component adapters | `OmitArg`, `FixedArgs`, `withSlot` |
| Checked state | `CheckedState`, `ariaChecked`, `syncCheckedState` |
| Values and filtering | `bool`, `flag`, `text`, `strings`, `matchesTokens`, `defaultResultsLabel`, `resolveFilter`, `toNumber`, `emptyChildren` |
| Classes and styles | `clx`, `stlx`, `StyleValue`, `StyleObject`, `StyleInput` |

`OmitArg` removes named properties while preserving Ajo's open argument
index. `FixedArgs` marks properties supplied by an adapter.

## Styling

Components render semantic elements, ARIA attributes, `data-slot` markers, and
state attributes. Apply visual styles through `class`, family class maps, or
state-aware class callbacks such as `dayClassName`.

Boolean state attributes use `data-x="true"` when active. Common
`data-state` values include `open`, `closed`, `checked`, `unchecked`,
`active`, `inactive`, `on`, and `off`.

## State

Controlled and uncontrolled families use matching prop groups:

- `value`, `defaultValue`, `onValueChange(value, event)`
- `open`, `defaultOpen`, `onOpenChange(open, event)`
- `checked`, `defaultChecked`, `onCheckedChange(checked, event)`

## Localization and Direction

User-visible and assistive-technology strings have English defaults and
component args for replacement.

`DirectionProvider` supplies the default text direction. Components with
horizontal keyboard navigation also accept a `dir` override.

Component-family subpaths and root imports are side-effect-free and
tree-shakeable.
