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

`ajo-cloves` requires `ajo ^0.2.0`.

```tsx
import type { Host } from 'ajo'
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
| `controlled` | Controlled/uncontrolled value state. | `fallback`, `onChange`; methods `sync`, `set` (notifies `onChange` before the value updates), `init`. |
| `dismiss` | Escape anywhere in the host's document (unless a handler already prevented it) and optional outside-pointer dismissal. | `active`, `inside`, `escape` (boolean, default true), `outside`, `prevent`, `onDismiss`. |
| `hover` | Hover intent across named zones with open/close delays. | Required `openDelay`, `closeDelay`, `onChange`; methods `hold`, `release`, `sync`, `cancel`. |
| `timer` | One-shot timeout cleared with the host. | No options; methods `start`, `stop`; getter `running`. |
| `roving` | Keyboard movement over a live item list; without a current item, arrows start at the first or last item. | `items`, `orientation` (`horizontal` or `vertical`), `dir`, `loop`, `current`, `onMove`; method `handle`. |
| `typeahead` | Printable-key buffer matched against `data-label` or text content; resets after 600 ms. | `items`, `onMatch`; method `handle`. |
| `selection` | Single or multi selection over string values. | `multiple`, `required`, `fallback`, `onChange`; methods `has`, `toggle`, `sync`. |
| `move` | Pointer-drag session lifecycle with deltas and cancellation. | `onStart`, `onMove`, `onEnd` receive `dx`, `dy`, `canceled`; method `start`. |
| `hotkey` | Global single-chord keyboard shortcut; a match is always prevented. | `keys`, `active`, `onPress`. |
| `announce` | Polite screen-reader announcements. | No options; method `polite`; one document-lifetime `role=status` region. |

### Positioning

| Export | Purpose | Key options |
|---|---|---|
| `indicator` | Tracks a marked child's box as CSS variables on its container. | `target`, `of`; method `sync`. |

### Sensors

| Export | Purpose | Key options |
|---|---|---|
| `media` | Reactive media-query match, subscribed at setup; false on the server. Dark mode is `(prefers-color-scheme: dark)`. | `query`; method `sync` (only when the query changes). |
| `storage` | Reactive `localStorage` string with cross-tab sync; the fallback on the server or when storage throws. Compare the value with known literals. | `key` (string), `fallback`; getter `value`, method `set`. |
| `scrolling` | Frame-coalesced scroll tracking for a live element. | `target`, `onScroll`, `onEnd`; method `sync`. |
| `resize` | Shared `ResizeObserver` notifications for a live element. | `target`, `onResize`; method `sync`. |
| `overflow` | Stamps `data-overflow-x`/`-y` (`start`/`end`/`both`) while content overflows a live scrollable element, and `--overflow-x-offset` (px scrolled from the inline start) while it overflows sideways. | `target`; method `sync`. |
| `visibility` | Reactive document visibility. | No options. |

### Infrastructure

| Export | Purpose | Key options |
|---|---|---|
| `browser` | Tests whether both Window and Document globals are available. | No options; false in Node, workers, and asymmetric shims. |
| `dom` | Distinguishes a real element from an ajo/html protocol-only host. | Structural cross-realm element guard. |
| `listen` | Adds a listener to a DOM host, inert under SSR. | Stops when either the host or optional caller signal aborts. |
| `callHandler` | Composes an optional consumer event handler. | Invokes function values with the original event. |
| `callRef` | Composes an optional callback ref. | Forwards both element and `null`. |
| `clamp` | Clamps a number to an inclusive range. | `value`, `min`, `max`. |
| `remember` | Stores a value in an insertion-ordered bounded cache. | FIFO; at most 32 keys. |
| `id` | Monotonic per-prefix id generator. | `prefix`. |
| `frame` | Coalesces repeated calls into one callback on the next animation frame. | Callback; returned scheduler has `cancel()`. |

## Runtime Behavior

- Each clove handles one reusable concern and composes with other cloves.
- DOM work follows native browser behavior and accessible interaction patterns.
- Work attached to a host stops when `host.signal` aborts.
- APIs that accept a caller signal stop when either signal aborts.
- DOM helpers stay inert during SSR.
- Function options are evaluated when an operation runs, so they can read the
  latest component args.
