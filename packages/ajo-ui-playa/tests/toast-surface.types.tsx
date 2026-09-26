import * as theme from 'ajo-ui-playa/toast'
import { Toaster, toast } from 'ajo-ui-playa/toast'

type HookShaped<Key extends string> = Key extends `use${infer Name}`
	? Name extends Capitalize<Name> ? Key : never
	: never

type HookShapedExports<T> = HookShaped<Extract<keyof T, string>>
type NoHookShapedExports<T> = [HookShapedExports<T>] extends [never] ? true : never

export const themeHasNoHookShapedExports: NoHookShapedExports<typeof theme> = true

// @ts-expect-error Themed Toaster does not expose a marker with no visual effect.
export const deadThemeArg = <Toaster theme="dark" />

// Toasts are addressed by id: updates pass `{ id }` and dismissal takes the id.
export const toastId: string = toast.success('Saved', { id: toast('Saving') })
