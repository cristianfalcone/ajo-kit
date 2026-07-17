declare const root: typeof import('ajo-ui')
declare const carousel: typeof import('ajo-ui/carousel')
declare const chart: typeof import('ajo-ui/chart')
declare const checkbox: typeof import('ajo-ui/checkbox-group')
declare const collapsible: typeof import('ajo-ui/collapsible')
declare const direction: typeof import('ajo-ui/direction')
declare const field: typeof import('ajo-ui/field')
declare const menu: typeof import('ajo-ui/menu')
declare const messageScroller: typeof import('ajo-ui/message-scroller')
declare const radio: typeof import('ajo-ui/radio-group')
declare const resizable: typeof import('ajo-ui/resizable')
declare const sidebar: typeof import('ajo-ui/sidebar')
declare const toggle: typeof import('ajo-ui/toggle-group')

type HookShaped<Key extends string> = Key extends `use${infer Name}`
	? Name extends Capitalize<Name> ? Key : never
	: never

type HookShapedExports<T> = HookShaped<Extract<keyof T, string>>
type NoHookShapedExports<T> = [HookShapedExports<T>] extends [never] ? true : never

export const rootHasNoHookShapedExports: NoHookShapedExports<typeof root> = true

export const rootCarouselContext = root.CarouselContext
export const subpathCarouselContext = carousel.CarouselContext
export type RootCarouselContextValue = import('ajo-ui').CarouselContextValue
export type SubpathCarouselContextValue = import('ajo-ui/carousel').CarouselContextValue

export const rootChartIdContext = root.ChartIdContext
export const subpathChartIdContext = chart.ChartIdContext

export const rootCollapsibleContext = root.CollapsibleContext
export const subpathCollapsibleContext = collapsible.CollapsibleContext
export type RootCollapsibleContextValue = import('ajo-ui').CollapsibleContextValue
export type SubpathCollapsibleContextValue = import('ajo-ui/collapsible').CollapsibleContextValue

export const rootDirectionContext = root.DirectionContext
export const subpathDirectionContext = direction.DirectionContext

export const rootFieldContext = root.FieldContext
export const subpathFieldContext = field.FieldContext
export type RootFieldContextValue = import('ajo-ui').FieldContextValue
export type SubpathFieldContextValue = import('ajo-ui/field').FieldContextValue

// @ts-expect-error MenuContext is private to the composed menu family.
export const leakedRootMenuContext = root.MenuContext
// @ts-expect-error MenuContext is private to the composed menu family.
export const leakedSubpathMenuContext = menu.MenuContext
// @ts-expect-error MenuContextValue is private to the composed menu family.
export type LeakedRootMenuContextValue = import('ajo-ui').MenuContextValue
// @ts-expect-error MenuContextValue is private to the composed menu family.
export type LeakedSubpathMenuContextValue = import('ajo-ui/menu').MenuContextValue

export const rootMessageScrollerContext = root.MessageScrollerContext
export const subpathMessageScrollerContext = messageScroller.MessageScrollerContext
export type RootMessageScrollerApi = import('ajo-ui').MessageScrollerApi
export type SubpathMessageScrollerApi = import('ajo-ui/message-scroller').MessageScrollerApi

export const rootResizableContext = root.ResizableContext
export const subpathResizableContext = resizable.ResizableContext
export type RootResizableContextValue = import('ajo-ui').ResizableContextValue
export type SubpathResizableContextValue = import('ajo-ui/resizable').ResizableContextValue

export const rootSidebarContext = root.SidebarContext
export const subpathSidebarContext = sidebar.SidebarContext
export type RootSidebarContextValue = import('ajo-ui').SidebarContextValue
export type SubpathSidebarContextValue = import('ajo-ui/sidebar').SidebarContextValue

export const rootToggleContext = root.ToggleGroupContext
export const subpathToggleContext = toggle.ToggleGroupContext
export type RootToggleContextValue = import('ajo-ui').ToggleGroupContextValue
export type SubpathToggleContextValue = import('ajo-ui/toggle-group').ToggleGroupContextValue

export const publicCheckboxGroup = checkbox.CheckboxGroup
export const publicCheckboxGroupItem = checkbox.CheckboxGroupItem
export const publicRadioGroup = radio.RadioGroup
export const publicRadioGroupItem = radio.RadioGroupItem

declare const carouselValue: NonNullable<ReturnType<typeof carousel.CarouselContext>>
declare const messageScrollerValue: NonNullable<ReturnType<typeof messageScroller.MessageScrollerContext>>

// @ts-expect-error Viewport registration is private to Carousel parts.
export const leakedCarouselRegistrar = carouselValue.setViewport
// @ts-expect-error DOM registration is private to MessageScroller parts.
export const leakedMessageScrollerRegistrar = messageScrollerValue.setViewport

// @ts-expect-error CarouselPartsContext is module-private.
export const leakedCarouselPartsContext = carousel.CarouselPartsContext
// @ts-expect-error The full ChartContext is module-private.
export const leakedChartContext = chart.ChartContext
// @ts-expect-error MessageScrollerPartsContext is module-private.
export const leakedMessageScrollerPartsContext = messageScroller.MessageScrollerPartsContext
// @ts-expect-error CheckboxGroupContext is module-private.
export const leakedRootCheckboxContext = root.CheckboxGroupContext
// @ts-expect-error CheckboxGroupContext is module-private.
export const leakedSubpathCheckboxContext = checkbox.CheckboxGroupContext
// @ts-expect-error RadioGroupContext is module-private.
export const leakedRootRadioContext = root.RadioGroupContext
// @ts-expect-error RadioGroupContext is module-private.
export const leakedSubpathRadioContext = radio.RadioGroupContext

// @ts-expect-error CheckboxGroupContextValue is module-private.
export type LeakedRootCheckboxContextValue = import('ajo-ui').CheckboxGroupContextValue
// @ts-expect-error CheckboxGroupContextValue is module-private.
export type LeakedSubpathCheckboxContextValue = import('ajo-ui/checkbox-group').CheckboxGroupContextValue
