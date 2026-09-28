import type { Preset } from 'unocss'

// A busy Button keeps its width. Its own Spinner (decorative, since the button
// reports aria-busy) takes the place of a leading icon. Without one, the
// label keeps its room but is not painted, so it stays the accessible name,
// and the Spinner, still in the label's colour, sits centred over it; any
// other icon hides with the label.
const leading = '>[data-slot=spinner]+:is(svg,[class^=i-])'
const over = `.playa-busy[aria-busy=true]:has(>[data-slot=spinner][aria-hidden=true]):not(:has(${leading}))`
const busy = [
  `.playa-busy[aria-busy=true]${leading}{display:none}`,
  ':where(.playa-busy[aria-busy=true]){position:relative}',
  `${over}{-webkit-text-fill-color:transparent;text-decoration-color:transparent}`,
  `${over}>[data-slot=spinner]{position:absolute;inset:0;margin:auto}`,
  `${over}>:is(svg,[class^=i-]){visibility:hidden}`,
].join('')

// The plate's sheen: a soft specular band under the label, out of sight at
// rest, so rest is exactly the plate. Hover slides it to the middle, slower
// than the state colours change; with reduced motion it just appears.
const sheen = [
  ':where(.playa-sheen){position:relative}.playa-sheen{isolation:isolate}',
  '.playa-sheen::before{content:"";position:absolute;inset:1px;z-index:-1;border-radius:inherit;pointer-events:none;background:linear-gradient(105deg,transparent 35%,rgb(255 250 238/.55) 50%,transparent 65%) 100% 0/300% 100% no-repeat;transition:background-position 700ms var(--ease)}',
  '.playa-sheen:hover::before{background-position:50% 0}',
  '@media (prefers-reduced-motion:reduce){.playa-sheen::before{transition:none}}',
].join('')

// A ButtonGroup separator is the seam of the member before it, so that member
// drops its trailing hairline as the one after drops its leading one (see
// internal/seams): the seam stays one line. A middle member keeps only the
// two sides across the axis. These outrank the seam utilities, rtl twins
// included, and the middle rule comes last to win its tie with the rtl one.
const ring = 'var(--un-inset-ring-color,currentColor)'
const [top, bottom, left, right] = ['0 1px', '0 -1px', '1px 0', '-1px 0'].map(offset => `inset ${offset} 0 ${ring}`)
const before = ':has(+[data-slot=button-group-separator])'
const row = '.playa-button-group[data-orientation=horizontal]>'
const column = '.playa-button-group[data-orientation=vertical]>'
const separated = [
  `${row}${before}{--un-inset-ring-shadow:${top},${bottom},${left}}`,
  `[dir=rtl] ${row}${before}{--un-inset-ring-shadow:${top},${bottom},${right}}`,
  `${row}:not(:first-child)${before}{--un-inset-ring-shadow:${top},${bottom}}`,
  `${column}${before}{--un-inset-ring-shadow:${left},${right},${top}}`,
  `${column}:not(:first-child)${before}{--un-inset-ring-shadow:${left},${right}}`,
].join('')

/** Shortcuts and rules of Button, ButtonGroup, Toolbar, Toggle, ToggleGroup, Spinner and Kbd. */
export const actions: Preset = {
  name: 'ajo-ui-playa-actions',
  rules: [
    // Pressed buttons inside connected groups skip the press scale: group
    // segments touch to share their hairlines, and shrinking one opens a
    // visible gap on both sides. The doubled class outranks the buttons' own
    // active scale from the preflight layer.
    ['playa-button-group', [`.playa-button-group.playa-button-group>:active{scale:none}${separated}`], { layer: 'preflights' }],
    ['playa-busy', [busy], { layer: 'preflights' }],
    ['playa-sheen', [sheen], { layer: 'preflights' }],
  ],
  shortcuts: {
    // A composed row passes one height to its controls: h-control reads
    // --spacing-control, so the row redefines it for its subtree. A child
    // sized sm or lg on its own keeps that size.
    'playa-control-size': 'data-[size=sm]:[--spacing-control:var(--control-sm)] data-[size=lg]:[--spacing-control:var(--control-lg)]',
    // A details facet in a toolbar: its summary is a ghost control with a
    // Lucide chevron that points up while open, instead of the native triangle.
    'playa-toolbar-summary': "[&_summary]:flex [&_summary]:h-control [&_summary]:cursor-default [&_summary]:list-none [&_summary]:items-center [&_summary]:gap-1 [&_summary]:rounded-md [&_summary]:ps-3 [&_summary]:pe-2 [&_summary]:text-sm [&_summary]:font-medium [&_summary:hover]:bg-accent [&_summary::-webkit-details-marker]:hidden [&_summary]:after:i-lucide-chevron-down [&_summary]:after:size-4 [&_summary]:after:opacity-50 [&_summary]:after:content-[''] [&_[open]>summary]:after:rotate-180",
  },
}
