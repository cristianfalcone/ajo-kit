import * as cloves from 'ajo-cloves'
import * as ui from 'ajo-ui'
import * as uiUtils from 'ajo-ui/utils'

export const publicStatefulRootAttrs = cloves.statefulRootAttrs
export const publicCallHandler = cloves.callHandler
export const publicCallRef = cloves.callRef
export const publicClamp = cloves.clamp
export const publicDom = cloves.dom
export const publicListen = cloves.listen

// @ts-expect-error Component argument adapters belong to ajo-ui/utils, not ajo-cloves.
export const leakedClovesOmitArg = cloves.OmitArg
// @ts-expect-error Ajo protocol utilities belong to ajo-cloves, not the ajo-ui root.
export const leakedUiRootAttrs = ui.statefulRootAttrs
// @ts-expect-error The previous ajo-ui/utils ownership was removed without an alias.
export const leakedUiUtilsHandler = uiUtils.callHandler
// @ts-expect-error General numeric helpers belong to ajo-cloves, not ajo-ui/utils.
export const leakedUiUtilsClamp = uiUtils.clamp
// @ts-expect-error The previous isDom name was replaced by the canonical cloves dom helper.
export const legacyIsDom = cloves.isDom
// @ts-expect-error statefulArg is an implementation detail of statefulRootAttrs.
export const leakedStatefulArg = cloves.statefulArg
// @ts-expect-error statefulArg did not remain behind in the previous public utils owner.
export const leakedUiStatefulArg = uiUtils.statefulArg
// @ts-expect-error Popover state detection is an implementation detail of the UI helpers.
export const leakedPopoverOpen = uiUtils.popoverOpen
