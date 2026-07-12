import * as base from 'ajo-ui'
import * as theme from '/src/ui'
import { Toaster } from '/src/ui/toast'

// @ts-expect-error Themed Toaster does not expose a marker with no visual effect.
export const deadThemeArg = <Toaster theme="dark" />

// @ts-expect-error Toast controls are direct exports; no hook-shaped alias remains.
export const deadBaseUseToast = base.useToast

// @ts-expect-error The theme layer does not duplicate the direct Toast controls.
export const deadThemeUseToast = theme.useToast
