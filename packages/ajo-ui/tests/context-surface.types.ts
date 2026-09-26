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

export const subpathCarouselContext = carousel.CarouselContext
export type SubpathCarouselContextValue = import('ajo-ui/carousel').CarouselContextValue

export const subpathChartIdContext = chart.ChartIdContext

export const subpathCollapsibleContext = collapsible.CollapsibleContext
export type SubpathCollapsibleContextValue = import('ajo-ui/collapsible').CollapsibleContextValue

export const subpathDirectionContext = direction.DirectionContext

export const subpathFieldContext = field.FieldContext
export type SubpathFieldContextValue = import('ajo-ui/field').FieldContextValue

// @ts-expect-error MenuContext is private to the composed menu family.
export const leakedSubpathMenuContext = menu.MenuContext
// @ts-expect-error MenuContextValue is private to the composed menu family.
export type LeakedSubpathMenuContextValue = import('ajo-ui/menu').MenuContextValue

export const subpathMessageScrollerContext = messageScroller.MessageScrollerContext
export type SubpathMessageScrollerApi = import('ajo-ui/message-scroller').MessageScrollerApi

export const subpathResizableContext = resizable.ResizableContext
export type SubpathResizableContextValue = import('ajo-ui/resizable').ResizableContextValue

export const subpathSidebarContext = sidebar.SidebarContext
export type SubpathSidebarContextValue = import('ajo-ui/sidebar').SidebarContextValue

export const subpathToggleContext = toggle.ToggleGroupContext
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
export const leakedSubpathCheckboxContext = checkbox.CheckboxGroupContext
// @ts-expect-error RadioGroupContext is module-private.
export const leakedSubpathRadioContext = radio.RadioGroupContext

// @ts-expect-error CheckboxGroupContextValue is module-private.
export type LeakedSubpathCheckboxContextValue = import('ajo-ui/checkbox-group').CheckboxGroupContextValue
