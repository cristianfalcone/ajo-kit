import * as theme from '/src/ui'
import { Toaster } from '/src/ui/toast'

type HookShaped<Key extends string> = Key extends `use${infer Name}`
	? Name extends Capitalize<Name> ? Key : never
	: never

type HookShapedExports<T> = HookShaped<Extract<keyof T, string>>
type NoHookShapedExports<T> = [HookShapedExports<T>] extends [never] ? true : never

export const themeHasNoHookShapedExports: NoHookShapedExports<typeof theme> = true

// @ts-expect-error Themed Toaster does not expose a marker with no visual effect.
export const deadThemeArg = <Toaster theme="dark" />
