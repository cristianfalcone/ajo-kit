import { symbols, type Preset } from 'unocss'

// The one focus ring, as the preset's playa-focus draws it, for controls whose
// native input is invisible: the part around the input wears it.
const ring = 'var(--focus-width) solid var(--ring)'

// A slider rings only the thumb of its focused input. Its inputs come before
// its thumbs, in the same order, so the pairs are named one by one up to the
// three thumbs a caller uses; a range with more rings them all.
const paired = 3
const focusedThumb = [
  ...Array.from({ length: paired }, (_, index) =>
    `.playa-slider:has(>input:nth-of-type(${index + 1}):focus-visible)>[data-index="${index}"]`),
  `.playa-slider:has(>input:nth-of-type(n+${paired + 1}):focus-visible)>[data-slot=slider-thumb]`,
].join(',')
const slider = [
  '.playa-slider>[data-slot=slider-thumb]{outline:1px solid transparent;outline-offset:var(--focus-offset)}',
  `${focusedThumb}{outline:${ring}}`,
  '.playa-slider:has(>[aria-invalid="true"]){--ring:var(--danger)}',
  // Invalid turns the boundary. The range covers the groove's, so the thumbs,
  // visible at any value, turn theirs too.
  '.playa-slider:has(>[aria-invalid="true"])>[data-slot=slider-thumb]{--un-ring-color:var(--danger)}',
].join('')

/** Shortcuts and rules of Checkbox, CheckboxGroup, RadioGroup, Switch, Slider and Progress. */
export const choices: Preset = {
  name: 'ajo-ui-playa-choices',
  theme: {
    colors: {
      // D28: an "on" control takes the ink, the text colour, with its mark
      // (glyph or thumb) in the page colour. At night the ivory is dimmed
      // only as far as keeps it under the plate (luminance 0.385 against
      // 0.479), so a page of switches never outshines the one primary action:
      // 6.3:1 on its lightest surface (muted), 7.9:1 under the mark.
      ink: 'light-dark(var(--foreground),color-mix(in srgb,var(--foreground) 70%,var(--background)))',
      // An off switch's thumb and the slider's thumbs: ivory in both themes.
      ivory: 'light-dark(var(--popover),var(--foreground))',
    },
  },
  rules: [
    // The indeterminate Progress sweep. It sits in the preflight layer, so
    // utilities (motion-reduce's animate-none among them) still override it.
    ['playa-progress', ['.playa-progress[data-state=indeterminate]>[data-slot=progress-indicator]{animation:progress-slide 1.4s ease-in-out infinite}@keyframes progress-slide{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}'], { layer: 'preflights' }],
    ['playa-slider', [slider]],
    // The ring follows the input inside the part; an invalid control keeps
    // its danger hue while focused. At rest the outline is transparent, which
    // forced colours paint as the boundary.
    ['playa-choice-focus', [
      { outline: '1px solid transparent', 'outline-offset': 'var(--focus-offset)' },
      { [symbols.selector]: selector => `${selector}:has(>input:focus-visible)`, outline: ring },
      { [symbols.selector]: selector => `${selector}:has(>input[aria-invalid="true"]:focus-visible)`, 'outline-color': 'var(--danger)' },
    ]],
  ],
  shortcuts: {
    // The 16 px box of a checkbox, and with rounded-full of a radio: the input
    // boundary (D23), the ink when on and its glyph in the page colour. Invalid
    // turns only the boundary; disabled keeps it and mutes the fill instead of
    // fading, so it stays visible. Beside a label and its help it centres on
    // the label's line.
    'playa-checkbox-box': 'relative inline-flex size-4 rounded-xs shrink-0 items-center justify-center edge-input bg-transparent text-background transition-[background-color,box-shadow] duration-150 motion-reduce:transition-none playa-choice-focus [[data-slot=field]:has(>[data-slot=field-content])>&]:translate-y-0.5 has-[:enabled:checked]:bg-ink has-[[aria-invalid=true]]:inset-ring-danger has-[:disabled]:bg-muted has-[:disabled]:text-faint-foreground forced-colors:text-[CanvasText]',
    // The glyph in a box (a dot, or an icon whose mask fills with the current
    // colour) paints in the box's colour. Forced colours paint fills as the
    // page, so there the glyph keeps its fill in the text colour, whatever
    // colour a caller gives the box; the box passes it on to an icon that
    // inherits its colour (the indeterminate minus).
    'playa-choice-glyph': 'pointer-events-none bg-current forced-colors:forced-color-adjust-none forced-colors:text-[CanvasText]',
    // Ivory with the input boundary and a small drop; an on switch paints it
    // in the page colour, the mark of every on control.
    'playa-thumb': 'pointer-events-none rounded-full bg-ivory shadow-xs ring-1 ring-input forced-colors:forced-color-adjust-none forced-colors:bg-[CanvasText]',
  },
}
