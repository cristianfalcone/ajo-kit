import type { IntrinsicElements } from 'ajo'
import type {
	AccordionItemArgs,
	ChartContainerArgs,
	ChartPlotArgs,
	ChartTooltipArgs,
	CheckboxGroupItemArgs,
	CommandInputArgs,
	ContextMenuArgs,
	ContextMenuContentArgs,
	DialogContentArgs,
	InputDateArgs,
	MenuArgs,
	MenuContentArgs,
	MenuSubArgs,
	MenuSubContentArgs,
	MenubarArgs,
	MenubarContentArgs,
	MenubarMenuArgs,
	PopoverArgs,
	PopoverContentArgs,
	InputDateCalendarArgs,
	InputDateContentArgs,
	InputDateTimeArgs,
	InputTimeArgs,
	InputOTPArgs,
	NavigationMenuArgs,
	NavigationMenuContentArgs,
	NavigationMenuItemArgs,
	SelectArgs,
	SelectContentArgs,
	SliderArgs,
	ToasterArgs,
	ToggleGroupItemArgs,
	TooltipArgs,
	TooltipContentArgs,
} from 'ajo-ui'
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

// @ts-expect-error FixedArgs stays on the explicit utils subpath.
export type LeakedRootFixedArgs = import('ajo-ui').FixedArgs<'owned'>

// @ts-expect-error OmitArg stays on the explicit utils subpath.
export type LeakedRootOmitArg = import('ajo-ui').OmitArg<IntrinsicElements['div'], 'class'>

// Representative public contracts from root, nested, generated, and form families.
// @ts-expect-error Accordion owns the native details open state.
export const fixedAccordionItem: AccordionItemArgs = { open: true, value: 'one' }
// @ts-expect-error ChartPlot generates its own SVG children.
export const fixedChartPlot: ChartPlotArgs = { children: 'caller plot' }
// @ts-expect-error ChartTooltip has no synthetic default without a real SVG reference.
export const removedChartTooltipDefault: ChartTooltipArgs = { defaultIndex: 0 }
// @ts-expect-error Chart owns its private geometry profile.
export const fixedChartContainerGeometry: ChartContainerArgs = { middleware: [] }
// @ts-expect-error ChartTooltip cannot replace the Floating UI platform.
export const fixedChartTooltipPlatform: ChartTooltipArgs = { platform: {} }
// @ts-expect-error Chart placement and gap belong to its private profile.
export const fixedChartContainerPosition: ChartContainerArgs = { gap: 4, placement: 'top' }
// @ts-expect-error ChartTooltip cannot override its private placement.
export const fixedChartTooltipPosition: ChartTooltipArgs = { placement: 'bottom' }
// @ts-expect-error CheckboxGroup owns item checked state.
export const fixedCheckboxGroupItem: CheckboxGroupItemArgs = { checked: true, value: 'one' }
// @ts-expect-error CommandInput replaces native onchange with onValueChange.
export const fixedCommandInput: CommandInputArgs = { onchange: true }
// @ts-expect-error Dialog owns the native dialog open state.
export const fixedDialogContent: DialogContentArgs = { open: true }
// @ts-expect-error Menu owns submenu alignment.
export const fixedMenuSubContent: MenuSubContentArgs = { align: 'start' }
// @ts-expect-error InputOTP replaces native onChange with onValueChange.
export const fixedInputOTP: InputOTPArgs = { onChange: true }
// @ts-expect-error InputDateCalendar receives availability policy from its owning field root.
export const fixedInputDateCalendar: InputDateCalendarArgs = { unavailable: new Date() }
// @ts-expect-error Slider fixes the native input type.
export const fixedSlider: SliderArgs = { type: 'range' }
// @ts-expect-error Toaster generates its own children.
export const fixedToaster: ToasterArgs = { children: 'caller toast' }
// @ts-expect-error ToggleGroup owns item pressed state.
export const fixedToggleGroupItem: ToggleGroupItemArgs = { pressed: true, value: 'one' }

export const menuPositionAtRoot: MenuArgs = { gap: 8, placement: 'bottom-end' }
// @ts-expect-error Menu placement uses the shared PopupPlacement vocabulary.
export const invalidMenuPlacement: MenuArgs = { placement: 'below' }
// @ts-expect-error Menu uses placement/gap instead of split-axis positioning.
export const fixedMenuRootLegacyPosition: MenuArgs = { align: 'end', side: 'top', sideOffset: 12 }
// @ts-expect-error Menu owns collision policy through its profile.
export const fixedMenuRootCollision: MenuArgs = { collisionPadding: 16 }
// @ts-expect-error Menu does not expose raw Floating UI configuration.
export const fixedMenuRootEngine: MenuArgs = { boundary: document.body, constrain: true, middleware: [], strategy: 'fixed' }
// @ts-expect-error Menu replaces the native change event with onOpenChange.
export const fixedMenuRootChange: MenuArgs = { onchange: true }
// @ts-expect-error Submenu positioning belongs entirely to the submenu profile.
export const fixedMenuSubPosition: MenuSubArgs = { gap: 8, placement: 'right-start', side: 'right' }
// @ts-expect-error Submenu Floating UI configuration belongs to its profile.
export const fixedMenuSubEngine: MenuSubArgs = { boundary: document.body, middleware: [] }
// @ts-expect-error MenuSub replaces the native change event with onOpenChange.
export const fixedMenuSubChange: MenuSubArgs = { onchange: true }
// @ts-expect-error Menu positioning belongs to the root, not content.
export const fixedMenuContentPosition: MenuContentArgs = { align: 'end', side: 'top', sideOffset: 12 }
// @ts-expect-error Menu content cannot override the root profile's Floating UI configuration.
export const fixedMenuContentEngine: MenuContentArgs = { constrain: true, strategy: 'fixed' }
// @ts-expect-error Menu owns its native surface and menu semantics.
export const fixedMenuContentSemantics: MenuContentArgs = { id: 'custom-menu', popover: 'auto', role: 'dialog', tabindex: 0 }
// @ts-expect-error MenuSide was replaced by the shared PopupPlacement vocabulary.
export type RemovedMenuSide = import('ajo-ui/menu').MenuSide
// @ts-expect-error MenuAnchor was removed with fake DOM point references.
export type RemovedMenuAnchorArgs = import('ajo-ui/menu').MenuAnchorArgs

export const contextMenuObservedState: ContextMenuArgs = { onOpenChange: () => {} }
// @ts-expect-error ContextMenu cannot open without a real invocation point and source.
export const fixedContextMenuOpen: ContextMenuArgs = { defaultOpen: true, open: true }
// @ts-expect-error ContextMenu positioning belongs entirely to its context profile.
export const fixedContextMenuPosition: ContextMenuArgs = { gap: 8, placement: 'bottom-end' }
// @ts-expect-error ContextMenu content cannot override its root profile.
export const fixedContextMenuContentPosition: ContextMenuContentArgs = { side: 'bottom' }

export const menubarPositionAtRoot: MenubarArgs = { gap: 10, placement: 'top-end' }
// @ts-expect-error Menubar uses placement/gap instead of split-axis positioning.
export const fixedMenubarRootLegacyPosition: MenubarArgs = { align: 'end', side: 'top', sideOffset: 12 }
// @ts-expect-error Menubar collision and raw Floating UI configuration belong to its profile.
export const fixedMenubarRootEngine: MenubarArgs = { boundary: document.body, collisionPadding: 16, middleware: [], strategy: 'fixed' }
// @ts-expect-error Positioning is shared by the Menubar root, not one value-bearing menu.
export const fixedMenubarMenuPosition: MenubarMenuArgs = { gap: 4, placement: 'bottom-end' }
// @ts-expect-error Menubar content cannot override root positioning.
export const fixedMenubarContentPosition: MenubarContentArgs = { alignOffset: -4, side: 'bottom', sideOffset: 8 }
// @ts-expect-error Menubar content cannot expose raw Floating UI configuration.
export const fixedMenubarContentEngine: MenubarContentArgs = { boundary: document.body, middleware: [] }

export const popoverSemanticRoot: PopoverArgs = { label: 'Edit profile', placement: 'bottom-start' }
// @ts-expect-error Popover owns a required accessible and visible label.
export const missingPopoverLabel: PopoverArgs = {}
// @ts-expect-error Popover owns raw Floating UI configuration through its profile.
export const fixedPopoverRootEngine: PopoverArgs = { label: 'Edit profile', middleware: [] }
// @ts-expect-error Popover cannot replace the Floating UI platform.
export const fixedPopoverRootPlatform: PopoverArgs = { label: 'Edit profile', platform: {} }
// @ts-expect-error Popover content semantics and positioning belong to the root/module.
export const fixedPopoverContent: PopoverContentArgs = { id: 'custom', placement: 'top', role: 'menu', tabindex: 0 }
// @ts-expect-error Popover content cannot override raw geometry configuration.
export const fixedPopoverContentEngine: PopoverContentArgs = { middleware: [] }
export const popoverContentArrow: PopoverContentArgs = { arrow: true }
// @ts-expect-error PopoverArrow is private geometry rather than a public compound part.
export type RemovedPopoverArrow = import('ajo-ui/popover').PopoverArrowArgs
// @ts-expect-error Popover headers are generated from root metadata instead of public compound parts.
export type RemovedPopoverTitle = import('ajo-ui/popover').PopoverTitleArgs

export const tooltipPositionAtRoot: TooltipArgs = { gap: 12, placement: 'top-start' }
// @ts-expect-error Tooltip placement is a named semantic contract.
export const invalidTooltipPlacement: TooltipArgs = { placement: 'above' }
// @ts-expect-error Tooltip owns raw Floating UI configuration through its profile.
export const fixedTooltipRootEngine: TooltipArgs = { middleware: [] }
// @ts-expect-error Tooltip cannot replace the Floating UI platform.
export const fixedTooltipRootPlatform: TooltipArgs = { platform: {} }
// @ts-expect-error Tooltip positioning belongs to the root, not content.
export const fixedTooltipSide: TooltipContentArgs = { side: 'top' }
// @ts-expect-error Tooltip content cannot override collision policy.
export const fixedTooltipCollision: TooltipContentArgs = { collisionPadding: 16 }
// @ts-expect-error Tooltip content cannot override raw geometry configuration.
export const fixedTooltipContentEngine: TooltipContentArgs = { strategy: 'fixed' }
// @ts-expect-error Tooltip owns the content id and non-focusable tooltip semantics.
export const fixedTooltipContentSemantics: TooltipContentArgs = { id: 'custom-tip', role: 'dialog', tabindex: 0 }
// @ts-expect-error Tooltip always owns its internal arrow.
export const fixedTooltipArrow: TooltipContentArgs = { arrow: false }
// @ts-expect-error TooltipArrow is private geometry rather than a public compound part.
export type RemovedTooltipArrow = import('ajo-ui/tooltip').TooltipArrowArgs
// @ts-expect-error TooltipSide was replaced by the shared PopupPlacement vocabulary.
export type RemovedTooltipSide = import('ajo-ui/tooltip').TooltipSide

export const selectPositionAtRoot: SelectArgs = { gap: 10, placement: 'bottom-end' }
// @ts-expect-error Select placement uses the shared PopupPlacement vocabulary.
export const invalidSelectPlacement: SelectArgs = { placement: 'below' }
// @ts-expect-error Select owns collision and raw Floating UI configuration through its profile.
export const fixedSelectRootEngine: SelectArgs = { boundary: document.body, collisionPadding: 16, middleware: [], strategy: 'fixed' }
// @ts-expect-error Select positioning belongs to the root, not content.
export const fixedSelectContentPosition: SelectContentArgs = { gap: 4, placement: 'top', sideOffset: 8 }
// @ts-expect-error Select owns its native content id, popover state and focus surface.
export const fixedSelectContentSemantics: SelectContentArgs = { id: 'custom-select', popover: 'auto', tabindex: 0 }

export const inputDatePositionAtRoot: InputDateArgs = { gap: 8, placement: 'right-start' }
export const inputDateTimePositionAtRoot: InputDateTimeArgs = { gap: 12, placement: 'top-end' }
// @ts-expect-error InputTime has no popup and therefore exposes no positioning contract.
export const fixedInputTimePosition: InputTimeArgs = { gap: 8, placement: 'bottom-start' }
// @ts-expect-error InputDate uses placement/gap instead of split-axis positioning.
export const fixedInputDateRootLegacyPosition: InputDateArgs = { align: 'end', side: 'top', sideOffset: 12 }
// @ts-expect-error InputDate owns collision and raw Floating UI configuration through its date profile.
export const fixedInputDateRootEngine: InputDateArgs = { boundary: document.body, collisionPadding: 16, middleware: [] }
// @ts-expect-error InputDate positioning belongs to the root, not content.
export const fixedInputDateContentPosition: InputDateContentArgs = { gap: 4, placement: 'top', alignOffset: 2 }
// @ts-expect-error InputDate owns its native content id, popover state, dialog role and focus surface.
export const fixedInputDateContentSemantics: InputDateContentArgs = { id: 'custom-date', popover: 'auto', role: 'menu', tabindex: 0 }

export const navigationMenuPositionAtRoot: NavigationMenuArgs = { gap: 14, placement: 'right-start' }
// @ts-expect-error NavigationMenu uses placement/gap instead of split-axis positioning.
export const fixedNavigationMenuRootLegacyPosition: NavigationMenuArgs = { align: 'end', side: 'bottom', sideOffset: 8 }
// @ts-expect-error NavigationMenu owns collision and raw Floating UI configuration through its profile.
export const fixedNavigationMenuRootEngine: NavigationMenuArgs = { boundary: document.body, collisionPadding: 16, middleware: [] }
// @ts-expect-error Positioning is shared by the NavigationMenu root, not one item.
export const fixedNavigationMenuItemPosition: NavigationMenuItemArgs = { gap: 4, placement: 'top' }
// @ts-expect-error NavigationMenu positioning belongs to the root, not content.
export const fixedNavigationMenuContentPosition: NavigationMenuContentArgs = { gap: 4, placement: 'top', sideOffset: 8 }
// @ts-expect-error NavigationMenu owns its native content id, popover state and focus surface.
export const fixedNavigationMenuContentSemantics: NavigationMenuContentArgs = { id: 'custom-navigation', popover: 'auto', tabindex: 0 }
