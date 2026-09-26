import { ariaChecked, syncCheckedState, type CheckboxState } from 'ajo-ui/checkbox'

export const publicCheckboxState: CheckboxState = 'indeterminate'
export const publicCheckedAria: 'mixed' | 'true' | 'false' = ariaChecked(publicCheckboxState)
export const publicCheckedSync: (input: HTMLInputElement, companion?: HTMLElement | null) => CheckboxState = syncCheckedState
