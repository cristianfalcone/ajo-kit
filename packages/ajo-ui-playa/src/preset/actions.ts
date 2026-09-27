import type { Preset } from 'unocss'

/** Shortcuts and rules of Button, ButtonGroup, Toolbar, Toggle, ToggleGroup, Spinner and Kbd. */
export const actions: Preset = {
  name: 'ajo-ui-playa-actions',
  rules: [
    // Pressed buttons inside connected groups skip the press scale: group
    // segments touch to share their hairlines, and shrinking one opens a
    // visible gap on both sides. The doubled class outranks the buttons' own
    // active scale from the preflight layer.
    ['playa-button-group', ['.playa-button-group.playa-button-group>:active{scale:none}'], { layer: 'preflights' }],
  ],
}
