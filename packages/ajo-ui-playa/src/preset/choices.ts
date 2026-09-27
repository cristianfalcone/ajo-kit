import type { Preset } from 'unocss'

/** Shortcuts and rules of Checkbox, CheckboxGroup, RadioGroup, Switch, Slider and Progress. */
export const choices: Preset = {
  name: 'ajo-ui-playa-choices',
  // The indeterminate Progress sweep. It sits in the preflight layer, so
  // utilities (motion-reduce's animate-none among them) still override it.
  rules: [['playa-progress', ['.playa-progress[data-state=indeterminate]>[data-slot=progress-indicator]{animation:progress-slide 1.4s ease-in-out infinite}@keyframes progress-slide{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}'], { layer: 'preflights' }]],
  shortcuts: {
    'playa-checkbox-box': 'relative inline-flex size-4 shrink-0 items-center justify-center rounded-xs edge-input bg-transparent outline-none transition-[background-color,box-shadow] duration-150 motion-reduce:transition-none has-[:focus-visible]:inset-ring-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[[aria-invalid=true]]:inset-ring-danger has-[[aria-invalid=true]]:ring-danger/20',
  },
}
