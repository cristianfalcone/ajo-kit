import * as root from 'ajo-ui'
import * as utils from 'ajo-ui/utils'

// @ts-expect-error Multi-value coercion is public via ajo-ui/utils, not the package root.
export const leakedRootStrings = root.strings
export const publicUtilsStrings = utils.strings
export const publicUtilsDefaultResultsLabel = utils.defaultResultsLabel
export const publicUtilsResolveFilter = utils.resolveFilter
export const publicUtilsWithSlot = utils.withSlot

// @ts-expect-error Deleted internal module: composition helpers live in ajo-ui/utils.
export type DeletedSlotsModule = typeof import('ajo-ui/slots')
