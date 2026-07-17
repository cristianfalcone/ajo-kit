import type {
	AccordionArgs,
	AccordionContentArgs,
	AccordionItemArgs,
	AccordionMultipleArgs,
	AccordionSingleArgs,
	AccordionTriggerArgs,
} from 'ajo-ui-playa/accordion'
import type {
	CarouselArgs,
	CarouselButtonArgs,
	CarouselContentArgs,
	CarouselItemArgs,
} from 'ajo-ui-playa/carousel'
import type {
	ChartContainerArgs,
	ChartLegendArgs,
	ChartLegendContentArgs,
	ChartPieArgs,
	ChartPlotArgs,
	ChartTooltipArgs,
	ChartTooltipContentArgs,
} from 'ajo-ui-playa/chart'
import type {
	CheckboxGroupArgs,
	CheckboxGroupItemArgs,
} from 'ajo-ui-playa/checkbox-group'
import type {
	CollapsibleArgs,
	CollapsibleContentArgs,
	CollapsibleTriggerArgs,
} from 'ajo-ui-playa/collapsible'
import type {
	InputGroupAddonArgs,
	InputGroupArgs,
	InputGroupButtonArgs,
	InputGroupInputArgs,
	InputGroupTextArgs,
	InputGroupTextareaArgs,
} from 'ajo-ui-playa/input-group'
import type {
	InputOTPArgs,
	InputOTPGroupArgs,
	InputOTPSeparatorArgs,
	InputOTPSlotArgs,
} from 'ajo-ui-playa/input-otp'
import type {
	MenuArgs,
	MenuContentArgs,
	MenuSubArgs,
	PopupPlacement as MenuPopupPlacement,
	PopupPosition as MenuPopupPosition,
} from 'ajo-ui-playa/menu'
import type {
	ContextMenuArgs,
	ContextMenuContentArgs,
} from 'ajo-ui-playa/context-menu'
import type {
	MenubarArgs,
	MenubarContentArgs,
	MenubarMenuArgs,
	PopupPlacement as MenubarPopupPlacement,
	PopupPosition as MenubarPopupPosition,
} from 'ajo-ui-playa/menubar'
import type {
	MessageScrollerArgs,
	MessageScrollerButtonArgs,
	MessageScrollerContentArgs,
	MessageScrollerItemArgs,
	MessageScrollerViewportArgs,
} from 'ajo-ui-playa/message-scroller'
import type {
	RadioGroupArgs,
	RadioGroupItemArgs,
} from 'ajo-ui-playa/radio-group'
import type {
	ResizableHandleArgs,
	ResizablePanelArgs,
	ResizablePanelGroupArgs,
} from 'ajo-ui-playa/resizable'
import type {
	SliderArgs,
} from 'ajo-ui-playa/slider'
import type {
	TabsArgs,
	TabsContentArgs,
	TabsListArgs,
	TabsTriggerArgs,
} from 'ajo-ui-playa/tabs'
import type {
	ToggleGroupArgs,
	ToggleGroupItemArgs,
	ToggleGroupMultipleArgs,
	ToggleGroupSingleArgs,
} from 'ajo-ui-playa/toggle-group'
import { emptyMediaVariants } from 'ajo-ui-playa/empty'
import { navigationMenuTriggerVariants } from 'ajo-ui-playa/navigation-menu'
import { sidebarMenuActionVariants, sidebarMenuButtonVariants } from 'ajo-ui-playa/sidebar'

type StringClass<T extends { class?: string }> = T

/** Compile-only contract: themed DOM parts keep the theme's string class API. */
export type ThemeClassContracts = [
	StringClass<AccordionArgs>,
	StringClass<AccordionContentArgs>,
	StringClass<AccordionItemArgs>,
	StringClass<AccordionMultipleArgs>,
	StringClass<AccordionSingleArgs>,
	StringClass<AccordionTriggerArgs>,
	StringClass<CarouselArgs>,
	StringClass<CarouselButtonArgs>,
	StringClass<CarouselContentArgs>,
	StringClass<CarouselItemArgs>,
	StringClass<ChartContainerArgs>,
	StringClass<ChartLegendArgs>,
	StringClass<ChartLegendContentArgs>,
	StringClass<ChartPieArgs>,
	StringClass<ChartPlotArgs>,
	StringClass<ChartTooltipArgs>,
	StringClass<ChartTooltipContentArgs>,
	StringClass<CheckboxGroupArgs>,
	StringClass<CheckboxGroupItemArgs>,
	StringClass<CollapsibleArgs>,
	StringClass<CollapsibleContentArgs>,
	StringClass<CollapsibleTriggerArgs>,
	StringClass<InputGroupAddonArgs>,
	StringClass<InputGroupArgs>,
	StringClass<InputGroupButtonArgs>,
	StringClass<InputGroupInputArgs>,
	StringClass<InputGroupTextArgs>,
	StringClass<InputGroupTextareaArgs>,
	StringClass<InputOTPArgs>,
	StringClass<InputOTPGroupArgs>,
	StringClass<InputOTPSeparatorArgs>,
	StringClass<InputOTPSlotArgs>,
	StringClass<MessageScrollerArgs>,
	StringClass<MessageScrollerButtonArgs>,
	StringClass<MessageScrollerContentArgs>,
	StringClass<MessageScrollerItemArgs>,
	StringClass<MessageScrollerViewportArgs>,
	StringClass<RadioGroupArgs>,
	StringClass<RadioGroupItemArgs>,
	StringClass<ResizableHandleArgs>,
	StringClass<ResizablePanelArgs>,
	StringClass<ResizablePanelGroupArgs>,
	StringClass<SliderArgs>,
	StringClass<TabsArgs>,
	StringClass<TabsContentArgs>,
	StringClass<TabsListArgs>,
	StringClass<TabsTriggerArgs>,
	StringClass<ToggleGroupArgs>,
	StringClass<ToggleGroupItemArgs>,
	StringClass<ToggleGroupMultipleArgs>,
	StringClass<ToggleGroupSingleArgs>,
]

/** Compile-only contract for the deliberate public variant-helper surface. */
export const publicVariantSurface = [
	emptyMediaVariants({ variant: 'icon' }),
	navigationMenuTriggerVariants({ class: 'group' }),
	sidebarMenuActionVariants({ showOnHover: true }),
	sidebarMenuButtonVariants({ size: 'lg', variant: 'outline' }),
]

// @ts-expect-error Playa mirrors the clean base Tooltip surface without legacy aliases.
export type RemovedTooltipAlign = import('ajo-ui-playa/tooltip').TooltipAlign
// @ts-expect-error The themed popup surface owns arrow geometry internally.
export type RemovedTooltipArrowArgs = import('ajo-ui-playa/tooltip').TooltipArrowArgs
// @ts-expect-error The themed popup surface owns arrow geometry internally.
export type RemovedPopoverArrowArgs = import('ajo-ui-playa/popover').PopoverArrowArgs

export const themedMenuPosition: MenuArgs = { gap: 6, placement: 'bottom-end' }
export const themedMenuPlacement: MenuPopupPlacement = 'top-start'
export const themedMenuPopupPosition: MenuPopupPosition = { gap: 4, placement: themedMenuPlacement }
// @ts-expect-error Playa mirrors the sealed base Menu root position surface.
export const themedMenuLegacyPosition: MenuArgs = { side: 'top' }
// @ts-expect-error Playa mirrors profile-owned submenu positioning.
export const themedMenuSubPosition: MenuSubArgs = { placement: 'right-start' }
// @ts-expect-error Playa keeps Menu positioning at the root.
export const themedMenuContentPosition: MenuContentArgs = { side: 'top' }
// @ts-expect-error Playa does not republish the removed legacy MenuAlign vocabulary.
export type RemovedMenuAlign = import('ajo-ui-playa/menu').MenuAlign
// @ts-expect-error Playa does not republish the removed legacy MenuSide vocabulary.
export type RemovedMenuSide = import('ajo-ui-playa/menu').MenuSide
// @ts-expect-error Playa does not republish the removed fake Menu anchor.
export type RemovedMenuAnchorArgs = import('ajo-ui-playa/menu').MenuAnchorArgs

export const themedContextMenu: ContextMenuArgs = { onOpenChange: () => {} }
// @ts-expect-error ContextMenu is invocation-driven and cannot begin open.
export const themedContextMenuOpen: ContextMenuArgs = { open: true }
// @ts-expect-error ContextMenu positioning is private profile policy.
export const themedContextMenuPosition: ContextMenuArgs = { placement: 'bottom-start' }
// @ts-expect-error ContextMenu content cannot carry legacy positioning.
export const themedContextMenuContentPosition: ContextMenuContentArgs = { align: 'start' }

export const themedMenubarPlacement: MenubarPopupPlacement = 'top-end'
export const themedMenubarPopupPosition: MenubarPopupPosition = { gap: 10, placement: themedMenubarPlacement }
export const themedMenubarPosition: MenubarArgs = themedMenubarPopupPosition
// @ts-expect-error Playa mirrors the sealed base Menubar root position surface.
export const themedMenubarLegacyPosition: MenubarArgs = { side: 'top' }
// @ts-expect-error Positioning is shared by the Playa Menubar root.
export const themedMenubarMenuPosition: MenubarMenuArgs = { placement: 'bottom-end' }
// @ts-expect-error Playa keeps Menubar positioning out of content.
export const themedMenubarContentPosition: MenubarContentArgs = { alignOffset: -4 }
