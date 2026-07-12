import type { IntrinsicElements } from 'ajo'
import type {
	AccordionItemArgs,
	ChartPlotArgs,
	CheckboxGroupItemArgs,
	CommandInputArgs,
	DialogContentArgs,
	DropdownMenuSubContentArgs,
	InputDateCalendarArgs,
	InputOTPArgs,
	SliderArgs,
	ToasterArgs,
	ToggleGroupItemArgs,
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
// @ts-expect-error CheckboxGroup owns item checked state.
export const fixedCheckboxGroupItem: CheckboxGroupItemArgs = { checked: true, value: 'one' }
// @ts-expect-error CommandInput replaces native onchange with onValueChange.
export const fixedCommandInput: CommandInputArgs = { onchange: true }
// @ts-expect-error Dialog owns the native dialog open state.
export const fixedDialogContent: DialogContentArgs = { open: true }
// @ts-expect-error DropdownMenu owns submenu alignment.
export const fixedDropdownSubContent: DropdownMenuSubContentArgs = { align: 'start' }
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
