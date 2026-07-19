# ajo-cloves

Reusable behavior primitives for Ajo components.

A clove is a plain function that attaches one UI behavior to a stateful Ajo
host and returns a live view. Applications and component libraries can compose
only the behaviors they need.

See Ajo's [Cloves: Sharing Logic](https://github.com/cristianfalcone/ajo#cloves-sharing-logic)
guide for the component pattern.

## Install

```bash
pnpm add ajo-cloves ajo
```

`ajo-cloves` requires `ajo ^0.1.35`.

```tsx
import type { Host } from 'ajo-cloves'
import { controlled, dismiss } from 'ajo-cloves'

type DisclosureArgs = {
	open?: boolean
	onOpenChange?: (open: boolean, event?: Event) => void
}

function* Disclosure(this: Host, args: DisclosureArgs) {
	let trigger: HTMLButtonElement | null = null
	let content: HTMLDivElement | null = null
	let onOpenChange = args.onOpenChange

	const open = controlled(this, {
		fallback: false,
		onChange: (value, event) => onOpenChange?.(value, event),
	})

	dismiss(this, {
		active: () => open.value,
		inside: () => [trigger, content],
		outside: true,
		onDismiss: event => open.set(false, event),
	})

	for (args of this) {
		onOpenChange = args.onOpenChange
		open.sync(args.open)

		yield (
			<>
				<button
					ref={el => trigger = el}
					aria-expanded={open.value ? 'true' : 'false'}
					set:onclick={event => open.set(!open.value, event)}
				>
					Details
				</button>
				{open.value && (
					<div ref={el => content = el}>
						Reusable behavior stays independent of component markup.
					</div>
				)}
			</>
		)
	}
}
```

## Attr Bags

Views can expose attr bags for JSX spread when a behavior needs to apply several
attributes and handlers to one element.

Bags contain HTML attributes such as `role`, `aria-*`, `tabindex`, `id`, and
`data-*`, plus Ajo `set:on*` handlers. `ajo/html` renders the HTML attributes for
SSR, and the client attaches event handlers during hydration.

Use bags for events attached to rendered children. Ajo reapplies the bag when
keyed reconciliation reuses an element.

## Catalog

### Interaction

| Export | Purpose | Key options |
|---|---|---|
| `controlled` | Controlled/uncontrolled value state. | `fallback`, `onChange`; methods `sync`, `set`, `accept`, `init`. |
| `dismiss` | Escape and optional outside-pointer dismissal. | `active`, `inside`, `escape`, `outside`, `prevent`, `onDismiss`. |
| `hover` | Hover intent across named zones with open/close delays. | `openDelay`, `closeDelay`, `onChange`; methods `hold`, `release`, `sync`, `cancel`. |
| `timer` | One-shot timeout with pause/resume. | No options; methods `start`, `stop`, `pause`, `resume`; getters `running`, `remaining`. |
| `roving` | Keyboard movement over a live item list. | `items`, `orientation`, `dir`, `loop`, `current`, `onMove`. |
| `typeahead` | Printable-key buffer and prefix matching. | `items`, `text`, `delay`, `onMatch`. |
| `selection` | Single or multi selection over string values. | `multiple`, `required`, `fallback`, `onChange`; methods `has`, `toggle`, `set`, `sync`. |
| `restore` | Capture and later restore focus. | No options; methods `capture`, `restore`. |
| `move` | Pointer-drag session lifecycle with deltas and cancellation. | `onStart`, `onMove`, `onEnd`. |
| `grid` | Semantic 2D key movement for grids/calendars. | `rtl`, `onMove`; type `GridMove`. |
| `spin` | Semantic spinbutton key stepping for step, page, and edge movement. | `onMove`; type `SpinMove`. |
| `label` | Field label/control/description/error id wiring. | `prefix`; returns `LabelView` attr bags. |
| `hotkey` | Global single-chord keyboard shortcut. | `keys`, `active`, `prevent`, `onPress`. |
| `announce` | Polite/assertive screen-reader announcements. | No options; document-lifetime live regions. |
| `GridMove` | Type for semantic grid movement. | Variants: `cols`, `rows`, row/all edge, page movement. |
| `SpinMove` | Type for semantic spinbutton movement. | Variants: `step`, `page`, min/max edge. |
| `LabelView` | Type for the live field-labelling view. | Ids and label/control/button/group/description/error attr bags. |

### Positioning

| Export | Purpose | Key options |
|---|---|---|
| `indicator` | Tracks a marked child's box as CSS variables on its container. | `target`, `of`, `on`; method `sync`. |

### Sensors

| Export | Purpose | Key options |
|---|---|---|
| `media` | Reactive media-query match shared per query string. | `query`, `fallback`; method `sync`. |
| `scheme` | Reactive OS dark-scheme preference. | No options. |
| `storage` | Reactive `localStorage` or `sessionStorage` string value with cross-tab sync. | `key`, `fallback`, `area`. |
| `scrolling` | Frame-coalesced scroll tracking for a live element. | `target`, `onScroll`, `onEnd`; method `sync`. |
| `resize` | Shared `ResizeObserver` notifications for a live element. | `target`, `onResize`; method `sync`. |
| `overflow` | Stamps `data-overflow-x`/`-y` (`start`/`end`/`both`) while content overflows a live scrollable element. | `target`; method `sync`. |
| `visibility` | Reactive document visibility. | No options. |

### Infrastructure

| Export | Purpose | Key options |
|---|---|---|
| `Host` | Ajo host type re-export for clove authors and consumers. | `Host<TElement, TArgs>`. |
| `browser` | Tests whether both Window and Document globals are available. | No options; false in Node, workers, and asymmetric shims. |
| `dom` | Distinguishes a real element from an ajo/html protocol-only host. | Structural cross-realm element guard. |
| `listen` | Adds a listener to a DOM host, inert under SSR. | Stops when either the host or optional caller signal aborts. |
| `statefulRootAttrs` | Maps plain component attrs onto an Ajo Stateful host. | Preserves host protocol args and prefixes DOM attrs with `attr:`. |
| `callHandler` | Composes an optional consumer event handler. | Invokes function values with the original event. |
| `callRef` | Composes an optional callback ref. | Forwards both element and `null`. |
| `clamp` | Clamps a number to an inclusive range. | `value`, `min`, `max`. |
| `remember` | Stores a value in an insertion-ordered bounded cache. | FIFO; default limit 32; positive integer limits only. |
| `id` | Monotonic per-prefix id generator. | `prefix`. |
| `shared` | Shares one lazily started source among subscribers with the same key. | `key`, `start`, callback, `signal`; stops after the last subscriber aborts. |
| `frame` | Coalesces repeated calls into one callback on the next animation frame. | Callback; returned scheduler has `cancel()`. |

## Runtime Behavior

- Each clove handles one reusable concern and composes with other cloves.
- DOM work follows native browser behavior and accessible interaction patterns.
- Work attached to a host stops when `host.signal` aborts.
- APIs that accept a caller signal stop when either signal aborts.
- DOM helpers stay inert during SSR.
- Function options are evaluated when an operation runs, so they can read the
  latest component args.
