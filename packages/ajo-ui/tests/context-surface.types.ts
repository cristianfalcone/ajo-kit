declare const root: typeof import('ajo-ui')
declare const checkbox: typeof import('ajo-ui/checkbox-group')
declare const radio: typeof import('ajo-ui/radio-group')
declare const toggle: typeof import('ajo-ui/toggle-group')

export const rootToggleContext = root.ToggleGroupContext
export const subpathToggleContext = toggle.ToggleGroupContext
export type RootToggleContextValue = import('ajo-ui').ToggleGroupContextValue
export type SubpathToggleContextValue = import('ajo-ui/toggle-group').ToggleGroupContextValue
export const publicCheckboxGroup = checkbox.CheckboxGroup
export const publicCheckboxGroupItem = checkbox.CheckboxGroupItem
export const publicRadioGroup = radio.RadioGroup
export const publicRadioGroupItem = radio.RadioGroupItem

// @ts-expect-error CheckboxGroupContext is module-private.
export const leakedRootCheckboxContext = root.CheckboxGroupContext
// @ts-expect-error CheckboxGroupContext is module-private.
export const leakedSubpathCheckboxContext = checkbox.CheckboxGroupContext
// @ts-expect-error RadioGroupContext is module-private.
export const leakedRootRadioContext = root.RadioGroupContext
// @ts-expect-error RadioGroupContext is module-private.
export const leakedSubpathRadioContext = radio.RadioGroupContext

// @ts-expect-error CheckboxGroupContextValue is module-private.
export type LeakedRootCheckboxContextValue = import('ajo-ui').CheckboxGroupContextValue
// @ts-expect-error CheckboxGroupContextValue is module-private.
export type LeakedSubpathCheckboxContextValue = import('ajo-ui/checkbox-group').CheckboxGroupContextValue
