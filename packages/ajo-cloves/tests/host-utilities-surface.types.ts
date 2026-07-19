import * as cloves from 'ajo-cloves'

export const publicStatefulRootAttrs = cloves.statefulRootAttrs
export const publicCallHandler = cloves.callHandler
export const publicCallRef = cloves.callRef
export const publicClamp = cloves.clamp
export const publicDom = cloves.dom
export const publicListen = cloves.listen

// @ts-expect-error statefulArg is an implementation detail of statefulRootAttrs.
export const leakedStatefulArg = cloves.statefulArg
