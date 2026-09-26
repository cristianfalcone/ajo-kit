import type { Stateless } from 'ajo'
import clsx from 'clsx'
import { FieldContext } from 'ajo-ui/field'
import type { FixedArgs, OmitArg } from 'ajo-ui/utils'
import {
	Select as BaseSelect,
	SelectChip as BaseSelectChip,
	SelectChips as BaseSelectChips,
	SelectChipsInput as BaseSelectChipsInput,
	SelectClear as BaseSelectClear,
	SelectContent as BaseSelectContent,
	SelectCreate as BaseSelectCreate,
	SelectEmpty as BaseSelectEmpty,
	SelectInput as BaseSelectInput,
	SelectItem as BaseSelectItem,
	SelectLabel as BaseSelectLabel,
	SelectList as BaseSelectList,
	SelectSeparator as BaseSelectSeparator,
	SelectStatus as BaseSelectStatus,
	SelectTrigger as BaseSelectTrigger,
} from 'ajo-ui/select'
import type {
	SelectArgs,
	SelectChipArgs as BaseSelectChipArgs,
	SelectChipsArgs,
	SelectChipsInputArgs,
	SelectClearArgs as BaseSelectClearArgs,
	SelectContentArgs,
	SelectCreateArgs,
	SelectEmptyArgs,
	SelectFilter,
	SelectGroupArgs,
	SelectInputArgs as BaseSelectInputArgs,
	SelectItemArgs as BaseSelectItemArgs,
	SelectLabelArgs,
	SelectListArgs,
	SelectSeparatorArgs,
	SelectStatusArgs,
	SelectTriggerArgs as BaseSelectTriggerArgs,
	SelectValueArgs,
} from 'ajo-ui/select'
import { buttonVariants } from './button'
import { chipVariants } from './chip'
import { inputGroupAddon, inputGroupAddonAlign, inputGroupInput, inputGroupVariants } from './internal/recipes'
export { SelectGroup, SelectValue } from 'ajo-ui/select'
export type { PopupPlacement, PopupPosition } from 'ajo-ui/select'

export type { SelectArgs, SelectChipsArgs, SelectChipsInputArgs, SelectContentArgs, SelectCreateArgs, SelectEmptyArgs, SelectFilter, SelectGroupArgs, SelectLabelArgs, SelectListArgs, SelectSeparatorArgs, SelectStatusArgs, SelectValueArgs }
/** Visual size of the Playa select trigger. */
export type SelectSize = 'default' | 'sm'
export type SelectTriggerArgs = OmitArg<BaseSelectTriggerArgs, 'iconClass' | 'size'> & FixedArgs<'iconClass'> & {
	/** Trigger height, stamped as `data-size`. */
	size?: SelectSize
}
export type SelectClearArgs = OmitArg<BaseSelectClearArgs, 'iconClass'> & FixedArgs<'iconClass'>
export type SelectInputArgs = OmitArg<BaseSelectInputArgs, 'addonClass' | 'buttonClass' | 'buttonIconClass' | 'inputClass'> & FixedArgs<'addonClass' | 'buttonClass' | 'buttonIconClass' | 'inputClass'>
export type SelectItemArgs = OmitArg<BaseSelectItemArgs, 'indicatorClass' | 'indicatorIconClass'> & FixedArgs<'indicatorClass' | 'indicatorIconClass'>
export type SelectChipArgs = OmitArg<BaseSelectChipArgs, 'removeClass' | 'removeIconClass'> & FixedArgs<'removeClass' | 'removeIconClass'>

const rootBase = 'playa-select-root'
const triggerBase = 'playa-select-trigger'
// One element owns the height budget: the content is a flex column clamped to
// the reference's available height; the list shrinks (min-h-0) to make room
// for siblings (in-popup search, status, create row) instead of clipping them.
// The flex display MUST stay gated on :popover-open — an unconditional author
// display beats the UA [popover] display:none and keeps closed popups painted.
const contentBase = 'playa-select-content'
const listBase = 'playa-select-list'
const itemBase = 'playa-select-item'
const indicatorClass = 'playa-select-indicator'
const indicatorIconClass = 'playa-select-indicator-icon'
const chipsBase = 'playa-select-chips'
const chipInputBase = 'playa-select-chips-input'
const inputButtonBase = clsx(buttonVariants({ size: 'none', variant: 'muted-ghost' }), 'size-6 rounded-[calc(var(--radius)-5px)] [&_svg:not([class*=size-])]:size-4')
// A composed SelectClear takes the trigger's place while there is something to clear.
const inputTriggerBase = clsx(inputButtonBase, '[[data-slot=input-group-addon]:has([data-slot=select-clear])_&]:hidden')

/** Unified select: single, multiple, searchable, editable, chips, and tagging by composition. */
const Select = <Multiple extends boolean = false>({ class: classes, ...attrs }: SelectArgs<Multiple>) => (
	<BaseSelect<Multiple> {...attrs} class={clsx(rootBase, classes)} />
)

/** Button field for a Select. */
const SelectTrigger: Stateless<SelectTriggerArgs> = ({ class: classes, size = 'default', ...attrs }) => {
	const field = FieldContext()

	return (
		<BaseSelectTrigger
			{...(field?.buttonAttrs ?? {})}
			{...attrs}
			class={clsx(triggerBase, classes)}
			data-size={size}
			iconClass="playa-select-trigger-icon"
		/>
	)
}

/** Input field or in-popup search box for a Select. */
const SelectInput: Stateless<SelectInputArgs> = ({ class: classes, ...attrs }) => {
	const field = FieldContext()

	return (
		<BaseSelectInput
			{...(field?.controlAttrs ?? {})}
			{...attrs}
			addonClass={clsx(inputGroupAddon, inputGroupAddonAlign['inline-end'])}
			buttonClass={inputTriggerBase}
			buttonIconClass="i-lucide-chevron-down pointer-events-none size-4 text-muted-foreground"
			class={inputGroupVariants({ class: classes, width: 'auto' })}
			inputClass={inputGroupInput}
		/>
	)
}

/** Button that clears the current selection and search; compose it in SelectInput. */
const SelectClear: Stateless<SelectClearArgs> = ({ class: classes, ...attrs }) => (
	<BaseSelectClear
		{...attrs}
		class={clsx(inputButtonBase, classes)}
		iconClass="i-lucide-x pointer-events-none size-4"
	/>
)

/** Popup panel for Select options. */
const SelectContent: Stateless<SelectContentArgs> = ({ class: classes, ...attrs }) => (
	<BaseSelectContent {...attrs} class={clsx(contentBase, classes)} />
)

/** Listbox for Select options. */
const SelectList: Stateless<SelectListArgs> = ({ class: classes, ...attrs }) => (
	<BaseSelectList {...attrs} class={clsx(listBase, classes)} />
)

/** Selectable Select option. */
const SelectItem: Stateless<SelectItemArgs> = ({ class: classes, ...attrs }) => (
	<BaseSelectItem
		{...attrs}
		class={clsx(itemBase, classes)}
		indicatorClass={indicatorClass}
		indicatorIconClass={indicatorIconClass}
	/>
)

/** Label for a SelectGroup. */
const SelectLabel: Stateless<SelectLabelArgs> = ({ class: classes, ...attrs }) => (
	<BaseSelectLabel {...attrs} class={clsx('playa-select-label', classes)} />
)

/** Visual separator between Select groups. */
const SelectSeparator: Stateless<SelectSeparatorArgs> = ({ class: classes, ...attrs }) => (
	<BaseSelectSeparator {...attrs} class={clsx('playa-select-separator', classes)} />
)

/** Empty state shown when filtering hides every option. */
const SelectEmpty: Stateless<SelectEmptyArgs> = ({ class: classes, ...attrs }) => (
	<BaseSelectEmpty {...attrs} class={clsx('playa-select-empty', classes)} />
)

/** Keep-mounted polite live region for async status. */
const SelectStatus: Stateless<SelectStatusArgs> = ({ class: classes, ...attrs }) => (
	<BaseSelectStatus {...attrs} class={clsx('playa-select-status', classes)} />
)

/** Create-tag row shown while the search matches no option exactly. */
const SelectCreate: Stateless<SelectCreateArgs> = ({ class: classes, ...attrs }) => (
	<BaseSelectCreate {...attrs} class={clsx('playa-select-create', classes)} />
)

/** Chip input wrapper for multiple Select selections. */
const SelectChips: Stateless<SelectChipsArgs> = ({ class: classes, ...attrs }) => (
	<BaseSelectChips {...attrs} class={clsx(chipsBase, classes)} />
)

/** Selected chip for multiple Select usage; composes the Chip visual language. */
const SelectChip: Stateless<SelectChipArgs> = ({ class: classes, ...attrs }) => (
	<BaseSelectChip
		{...attrs}
		class={clsx(chipVariants({ variant: 'secondary' }), 'has-[button]:pr-1', classes)}
		removeClass="-mr-1 inline-flex size-4 shrink-0 items-center justify-center rounded-full opacity-50 hover:opacity-100"
		removeIconClass="i-lucide-x pointer-events-none size-3"
	/>
)

/** Input used inside SelectChips. */
const SelectChipsInput: Stateless<SelectChipsInputArgs> = ({ class: classes, ...attrs }) => (
	<BaseSelectChipsInput {...attrs} class={clsx(chipInputBase, classes)} />
)

export {
	Select,
	SelectChip,
	SelectChips,
	SelectChipsInput,
	SelectClear,
	SelectContent,
	SelectCreate,
	SelectEmpty,
	SelectInput,
	SelectItem,
	SelectLabel,
	SelectList,
	SelectSeparator,
	SelectStatus,
	SelectTrigger,
}
