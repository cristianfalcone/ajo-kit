import * as root from 'ajo-ui'
import type { CheckboxState } from 'ajo-ui/checkbox'
import * as utils from 'ajo-ui/utils'

export const publicCheckboxState: CheckboxState = 'indeterminate'

// @ts-expect-error Checked-state synchronization is public via ajo-ui/utils, not the package root.
export const leakedRootCheckedSync = root.syncCheckedState
export const publicUtilsCheckedSync = utils.syncCheckedState
// @ts-expect-error Checked-state ARIA mapping is public via ajo-ui/utils, not the package root.
export const leakedRootCheckedAria = root.ariaChecked
export const publicUtilsCheckedAria = utils.ariaChecked
// @ts-expect-error The shared type is public via ajo-ui/utils; the package root exposes CheckboxState instead.
export type LeakedRootCheckedState = import('ajo-ui').CheckedState
export type PublicUtilsCheckedState = import('ajo-ui/utils').CheckedState
