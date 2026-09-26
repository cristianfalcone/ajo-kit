import * as cloves from 'ajo-cloves'

export const publicStatefulRootAttrs = cloves.statefulRootAttrs
export const publicCallHandler = cloves.callHandler
export const publicCallRef = cloves.callRef
export const publicClamp = cloves.clamp
export const publicDom = cloves.dom
export const publicListen = cloves.listen

// @ts-expect-error statefulArg is an implementation detail of statefulRootAttrs.
export const leakedStatefulArg = cloves.statefulArg

// @ts-expect-error Host is ajo's own type; import it from 'ajo'.
export type LeakedHost = cloves.Host

// @ts-expect-error The shared source registry is internal to the sensor cloves.
export const leakedShared = cloves.shared
