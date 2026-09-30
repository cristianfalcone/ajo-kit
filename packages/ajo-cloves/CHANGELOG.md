# ajo-cloves

## 0.2.1

### Patch Changes

- `overflow` also sets `--overflow-x-offset` on the element while its content
  overflows sideways: how far it is scrolled from the inline start, so a fade
  drawn on the content can stay on the visible edges. The property is removed
  when nothing overflows sideways and when the host goes away.

## 0.2.0

### Breaking Changes

- Requires `ajo ^0.2.0`.
- Removed cloves: `grid` and `spin` (their key handling is private to
  `ajo-ui`'s Calendar and date segments), `label` and `LabelView` (Field wiring
  lives in `ajo-ui/field`), `restore` (popups own their focus return),
  `scheme` (use `media` with `(prefers-color-scheme: dark)`),
  `statefulRootAttrs` (private to `ajo-ui`), `shared`, and the `Host`,
  `GridMove` and `SpinMove` types. Import `Host` from `ajo`.
- `controlled` drops `accept`; use `set`.
- `timer` keeps `start`, `stop` and `running`: `pause`, `resume` and
  `remaining` are removed.
- `selection` drops `set`; use `toggle` and `sync`.
- `typeahead` drops the `text` and `delay` options: it matches `data-label` or
  text content and resets after 600 ms.
- `announce` has one polite region: the assertive region is removed.
- `hover` requires `openDelay` and `closeDelay`.
- `hotkey` always prevents a matched key: the `prevent` option is removed.
- `indicator` drops the `on` option.
- `media` drops `fallback` (false on the server) and subscribes at setup;
  `sync` matters only when the query changes.
- `storage` takes `{ key, fallback }`, reads and writes only `localStorage`
  (the `area` option is removed) and exposes `value` and `set`.
- `remember` keeps a fixed 32-entry bound; the limit argument is removed.
- `roving` drops the `both` orientation: `orientation` is `horizontal` or
  `vertical`.
- `dismiss` scopes Escape to the host's document, and returns early when a
  handler already prevented the Escape keydown.

### What Is New

- `media`, `visibility` and `storage` listen per host through `host.signal`,
  with no shared registry.
- `roving` starts at the first or last item when no item is current.
- `storage` returns its fallback when `localStorage` throws, and stays inert on
  the server.

### Upgrade Steps

1. Install `ajo-cloves@0.2.0` with `ajo@0.2.0`.
2. Import `Host` from `ajo`.
3. Replace `scheme(this)` with
   `media(this, { query: '(prefers-color-scheme: dark)' })`.
4. Replace `storage(this, { key, fallback, area: 'session' })` with an
   application-owned `sessionStorage` read, or drop `area` for `localStorage`.
5. Replace `controlled(...).accept(value)` with `set(value)`, and
   `selection(...).set(values)` with `sync(values)`.
6. Give every `hover` call explicit `openDelay` and `closeDelay`.
7. Move `label`, `grid`, `spin` and `restore` call sites to the `ajo-ui`
   families that own them (Field, Calendar, InputDate, the popup families).

## 0.1.2

### Patch Changes

- Simplify description presence reconciliation without changing label or ARIA updates.
