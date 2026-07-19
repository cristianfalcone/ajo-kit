import * as cloves from 'ajo-cloves'
import * as ui from 'ajo-ui'
import * as uiUtils from 'ajo-ui/utils'

// @ts-expect-error Component argument adapters belong to ajo-ui/utils, not ajo-cloves.
export const leakedClovesOmitArg = cloves.OmitArg
// @ts-expect-error Ajo protocol utilities belong to ajo-cloves, not the ajo-ui root.
export const leakedUiRootAttrs = ui.statefulRootAttrs
// @ts-expect-error General numeric helpers belong to ajo-cloves, not ajo-ui/utils.
export const leakedUiUtilsClamp = uiUtils.clamp
// @ts-expect-error Popover state detection is an implementation detail of the UI helpers.
export const leakedPopoverOpen = uiUtils.popoverOpen
