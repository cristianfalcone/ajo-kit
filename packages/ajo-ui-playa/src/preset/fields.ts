import type { Preset } from 'unocss'

// A vertical field is three rows keyed by data-slot, whatever the DOM order:
// the title (a label, or a FieldContent with a label and its help), the
// control (at least one control tall, its content centred) and the message.
// Help and error share the message cell: an error hides the help, which stays
// in aria-describedby, so it takes the help's line. A field that can be
// invalid (`data-invalid`, true or false) keeps one message line while it
// shows none, so its error moves nothing; a field with neither help nor
// validation has no message row, and one without a control keeps its help
// one field gap under its title, as a legend does. The parts sit behind
// :where(), so a utility on the field or a part (a responsive field's row)
// still overrides them.
const zones = '.playa-field-zones'
const control = ':not([data-slot^=field-])'
const title = ':is([data-slot=field-label],[data-slot=field-content])'
const message = ':is([data-slot=field-description],[data-slot=field-error])'
const fieldZones = [
  `${zones}{display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto auto}`,
  `${zones}:has(>${control}){grid-template-rows:auto minmax(var(--control),auto) auto}`,
  `${zones}>*,${zones}::after{grid-column:1}`,
  `${zones}>:where(${title}){grid-row:1;align-self:end;margin-bottom:var(--field-gap)}`,
  `${zones}>:where(${control}){grid-row:2;align-self:center}`,
  `${zones}>:where(${message}){grid-row:3;align-self:start;margin-top:0.25rem}`,
  `${zones}:where(:not(:has(>${control})))>:where(${message}){margin-top:0}`,
  `${zones}:where([data-invalid])::after{content:"";grid-row:3;min-height:calc(var(--field-message) + 0.25rem)}`,
  `${zones}:has(>[data-slot=field-error])>[data-slot=field-description]{visibility:hidden}`,
].join('')

// Neighbouring fields share their three rows through subgrid, so their
// controls keep one top when only one has help, an error or a wrapped label.
// Below the field group's `md` container width the row stacks, one field
// group gap apart.
const row = '.playa-field-row'
const fieldRow = [
  `${row}{display:flex;flex-direction:column;gap:1.5rem}`,
  `@container field-group (min-width:28rem){${row}{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);grid-template-rows:auto minmax(var(--control),auto) auto;gap:0 1.5rem}`,
  `${row}>${zones}{grid-row:span 3;grid-template-rows:subgrid}`,
  `${row}>[data-orientation=horizontal]{grid-row:2}}`,
].join('')

/** Shortcuts and rules of Field, Input, Textarea, InputGroup, InputOTP and Label. */
export const fields: Preset = {
  name: 'ajo-ui-playa-fields',
  // In the preflight layer, so a utility on a field or a row still overrides them.
  rules: [
    ['playa-field-zones', [fieldZones], { layer: 'preflights' }],
    ['playa-field-row', [fieldRow], { layer: 'preflights' }],
  ],
}
