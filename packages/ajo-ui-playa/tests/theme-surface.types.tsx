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
