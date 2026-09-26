import type { IntrinsicElements } from 'ajo'
import type { AccordionItemArgs } from 'ajo-ui/accordion'
import type { ChartContainerArgs, ChartPlotArgs, ChartTooltipArgs } from 'ajo-ui/chart'
import type { CheckboxArgs } from 'ajo-ui/checkbox'
import type { CheckboxGroupItemArgs } from 'ajo-ui/checkbox-group'
import type { CommandInputArgs } from 'ajo-ui/command'
import type { ContextMenuArgs } from 'ajo-ui/context-menu'
import type { DialogContentArgs } from 'ajo-ui/dialog'
import type { InputDateArgs, InputDateCalendarArgs, InputDateContentArgs, InputDateTimeArgs, InputTimeArgs } from 'ajo-ui/input-date'
import type { InputOTPArgs } from 'ajo-ui/input-otp'
import type { MenuArgs, MenuContentArgs, MenuSubArgs } from 'ajo-ui/menu'
import type { MenubarArgs, MenubarMenuArgs } from 'ajo-ui/menubar'
import type { NavigationMenuArgs, NavigationMenuContentArgs, NavigationMenuItemArgs } from 'ajo-ui/navigation-menu'
import type { PopoverArgs, PopoverContentArgs } from 'ajo-ui/popover'
import type { RadioGroupItemArgs } from 'ajo-ui/radio-group'
import type { SelectArgs, SelectContentArgs, SelectInputArgs, SelectItemArgs } from 'ajo-ui/select'
import type { SliderArgs } from 'ajo-ui/slider'
import type { SwitchArgs } from 'ajo-ui/switch'
import type { ToasterArgs } from 'ajo-ui/toast'
import type { ToggleGroupItemArgs } from 'ajo-ui/toggle-group'
import type { TooltipArgs, TooltipContentArgs } from 'ajo-ui/tooltip'
import type { FixedArgs, OmitArg } from 'ajo-ui/utils'

type AdapterArgs = OmitArg<IntrinsicElements['button'], 'type'> & FixedArgs<'type'>

export const omittedArgsPreserveNamedTypes: AdapterArgs = {
	class: 'button',
	'data-custom': 'value',
}

// @ts-expect-error OmitArg preserves the named class contract over Ajo's open Args index.
export const omittedArgsRejectInvalidNamedTypes: AdapterArgs = { class: 123 }

// @ts-expect-error FixedArgs seals the adapter-owned argument removed by OmitArg.
export const omittedArgsRejectOwnedValues: AdapterArgs = { type: 'submit' }

export const fixedArgsAvailable: FixedArgs<'owned'> = {}

// @ts-expect-error Fixed adapter arguments reject caller values.
export const fixedArgsRejectValues: FixedArgs<'owned'> = { owned: true }

// Representative public contracts from root, nested, generated, and form families.
// @ts-expect-error Accordion owns the native details open state.
export const fixedAccordionItem: AccordionItemArgs = { open: true, value: 'one' }
// @ts-expect-error ChartPlot generates its own SVG children.
export const fixedChartPlot: ChartPlotArgs = { children: 'caller plot' }
// @ts-expect-error Chart placement and gap belong to its private profile.
export const fixedChartContainerPosition: ChartContainerArgs = { gap: 4, placement: 'top' }
// @ts-expect-error ChartTooltip cannot override its private placement.
export const fixedChartTooltipPosition: ChartTooltipArgs = { placement: 'bottom' }
// @ts-expect-error Checkbox keeps its live checked state in `checked`.
export const fixedCheckboxLiveState: CheckboxArgs = { 'set:checked': true }
// @ts-expect-error CheckboxGroup owns item checked state.
export const fixedCheckboxGroupItem: CheckboxGroupItemArgs = { checked: true, value: 'one' }
// @ts-expect-error CommandInput replaces native onchange with the Command search.
export const fixedCommandInput: CommandInputArgs = { onchange: true }
// @ts-expect-error Command search owns the CommandInput value.
export const fixedCommandInputValue: CommandInputArgs = { value: 'query' }
// @ts-expect-error Dialog owns the native dialog open state.
export const fixedDialogContent: DialogContentArgs = { open: true }
// @ts-expect-error InputOTP replaces native onChange with onValueChange.
export const fixedInputOTP: InputOTPArgs = { onChange: true }
// @ts-expect-error InputDateCalendar receives availability policy from its owning field root.
export const fixedInputDateCalendar: InputDateCalendarArgs = { unavailable: new Date() }
// @ts-expect-error InputDate values are zone-free wall dates, so the root owns the Calendar zone.
export const fixedInputDateCalendarZone: InputDateArgs = { calendar: { timeZone: 'Pacific/Kiritimati' } }
// @ts-expect-error RadioGroup owns item checked state.
export const fixedRadioGroupItem: RadioGroupItemArgs = { checked: true, value: 'one' }
// @ts-expect-error Slider fixes the native input type.
export const fixedSlider: SliderArgs = { type: 'range' }
// @ts-expect-error Switch keeps its live checked state in `checked`.
export const fixedSwitchLiveState: SwitchArgs = { 'set:checked': true }
// @ts-expect-error Toaster generates its own children.
export const fixedToaster: ToasterArgs = { children: 'caller toast' }
// @ts-expect-error ToggleGroup owns item pressed state.
export const fixedToggleGroupItem: ToggleGroupItemArgs = { pressed: true, value: 'one' }

export const menuPositionAtRoot: MenuArgs = { gap: 8, placement: 'bottom-end' }
// @ts-expect-error Menu placement uses the shared PopupPlacement vocabulary.
export const invalidMenuPlacement: MenuArgs = { placement: 'below' }
// @ts-expect-error Menu replaces the native change event with onOpenChange.
export const fixedMenuRootChange: MenuArgs = { onchange: true }
// @ts-expect-error Submenu positioning belongs entirely to the submenu profile.
export const fixedMenuSubPosition: MenuSubArgs = { gap: 8, placement: 'right-start' }
// @ts-expect-error MenuSub replaces the native change event with onOpenChange.
export const fixedMenuSubChange: MenuSubArgs = { onchange: true }
// @ts-expect-error Menu positioning belongs to the root, not content.
export const fixedMenuContentPosition: MenuContentArgs = { gap: 12, placement: 'top' }
// @ts-expect-error Menu owns its native surface and menu semantics.
export const fixedMenuContentSemantics: MenuContentArgs = { id: 'custom-menu', popover: 'auto', role: 'dialog', tabindex: 0 }

export const contextMenuObservedState: ContextMenuArgs = { onOpenChange: () => {} }
// @ts-expect-error ContextMenu cannot open without a real invocation point and source.
export const fixedContextMenuOpen: ContextMenuArgs = { defaultOpen: true, open: true }
// @ts-expect-error ContextMenu positioning belongs entirely to its context profile.
export const fixedContextMenuPosition: ContextMenuArgs = { gap: 8, placement: 'bottom-end' }

export const menubarPositionAtRoot: MenubarArgs = { gap: 10, placement: 'top-end' }
// @ts-expect-error Positioning is shared by the Menubar root, not one value-bearing menu.
export const fixedMenubarMenuPosition: MenubarMenuArgs = { gap: 4, placement: 'bottom-end' }

export const popoverSemanticRoot: PopoverArgs = { label: 'Edit profile', placement: 'bottom-start' }
// @ts-expect-error Popover owns a required accessible and visible label.
export const missingPopoverLabel: PopoverArgs = {}
// @ts-expect-error Popover content semantics and positioning belong to the root/module.
export const fixedPopoverContent: PopoverContentArgs = { id: 'custom', placement: 'top', role: 'menu', tabindex: 0 }
export const popoverContentArrow: PopoverContentArgs = { arrow: true }

export const tooltipPositionAtRoot: TooltipArgs = { gap: 12, placement: 'top-start' }
// @ts-expect-error Tooltip placement is a named semantic contract.
export const invalidTooltipPlacement: TooltipArgs = { placement: 'above' }
// @ts-expect-error Tooltip positioning belongs to the root, not content.
export const fixedTooltipContentPosition: TooltipContentArgs = { placement: 'top' }
// @ts-expect-error Tooltip owns the content id and non-focusable tooltip semantics.
export const fixedTooltipContentSemantics: TooltipContentArgs = { id: 'custom-tip', role: 'dialog', tabindex: 0 }
// @ts-expect-error Tooltip always owns its internal arrow.
export const fixedTooltipArrow: TooltipContentArgs = { arrow: false }

export const selectPositionAtRoot: SelectArgs = { gap: 10, placement: 'bottom-end' }
// @ts-expect-error Select placement uses the shared PopupPlacement vocabulary.
export const invalidSelectPlacement: SelectArgs = { placement: 'below' }
// @ts-expect-error Select positioning belongs to the root, not content.
export const fixedSelectContentPosition: SelectContentArgs = { gap: 4, placement: 'top' }
// @ts-expect-error Select owns its native content id, popover state and focus surface.
export const fixedSelectContentSemantics: SelectContentArgs = { id: 'custom-select', popover: 'auto', tabindex: 0 }
// @ts-expect-error Select inputValue owns the SelectInput value.
export const fixedSelectInputValue: SelectInputArgs = { value: 'query' }
// @ts-expect-error SelectItem ids are generated for aria-activedescendant.
export const fixedSelectItemId: SelectItemArgs = { id: 'custom-item', value: 'one' }

export const inputDatePositionAtRoot: InputDateArgs = { gap: 8, placement: 'right-start' }
export const inputDateTimePositionAtRoot: InputDateTimeArgs = { gap: 12, placement: 'top-end' }
// @ts-expect-error InputTime has no popup and therefore exposes no positioning contract.
export const fixedInputTimePosition: InputTimeArgs = { gap: 8, placement: 'bottom-start' }
// @ts-expect-error InputDate positioning belongs to the root, not content.
export const fixedInputDateContentPosition: InputDateContentArgs = { gap: 4, placement: 'top' }
// @ts-expect-error InputDate owns its native content id, popover state, dialog role and focus surface.
export const fixedInputDateContentSemantics: InputDateContentArgs = { id: 'custom-date', popover: 'auto', role: 'menu', tabindex: 0 }

export const navigationMenuPositionAtRoot: NavigationMenuArgs = { gap: 14, placement: 'right-start' }
// @ts-expect-error Positioning is shared by the NavigationMenu root, not one item.
export const fixedNavigationMenuItemPosition: NavigationMenuItemArgs = { gap: 4, placement: 'top' }
// @ts-expect-error NavigationMenu positioning belongs to the root, not content.
export const fixedNavigationMenuContentPosition: NavigationMenuContentArgs = { gap: 4, placement: 'top' }
// @ts-expect-error NavigationMenu owns its native content id, popover state and focus surface.
export const fixedNavigationMenuContentSemantics: NavigationMenuContentArgs = { id: 'custom-navigation', popover: 'auto', tabindex: 0 }
