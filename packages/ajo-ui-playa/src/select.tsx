import type { Stateless } from 'ajo'
import { clx, type OmitArg } from 'ajo-ui/utils'
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
	SelectChipArgs,
	SelectChipsArgs,
	SelectChipsInputArgs,
	SelectClearArgs,
	SelectContentArgs,
	SelectCreateArgs,
	SelectEmptyArgs,
	SelectFilter,
	SelectGroupArgs,
	SelectInputArgs,
	SelectItemArgs,
	SelectLabelArgs,
	SelectListArgs,
	SelectSeparatorArgs,
	SelectStatusArgs,
	SelectTriggerArgs as BaseSelectTriggerArgs,
	SelectValueArgs,
} from 'ajo-ui/select'
import { buttonVariants } from './button'
import { chipVariants } from './chip'
import { inputGroupVariants } from './internal/recipes'
export { SelectGroup, SelectValue } from 'ajo-ui/select'
export type { PopupPlacement, PopupPosition } from 'ajo-ui/select'

export type { SelectArgs, SelectChipArgs, SelectChipsArgs, SelectChipsInputArgs, SelectClearArgs, SelectContentArgs, SelectCreateArgs, SelectEmptyArgs, SelectFilter, SelectGroupArgs, SelectInputArgs, SelectItemArgs, SelectLabelArgs, SelectListArgs, SelectSeparatorArgs, SelectStatusArgs, SelectValueArgs }
/** Visual size of the Playa select trigger. */
export type SelectSize = 'default' | 'sm'
export type SelectTriggerArgs = OmitArg<BaseSelectTriggerArgs, 'size'> & {
	/** Trigger height, stamped as `data-size`. */
	size?: SelectSize
}

const clearBase = clx(
	buttonVariants({ size: 'none', variant: 'muted-ghost' }),
	'size-6 rounded-[calc(var(--radius)-5px)] [&_svg:not([class*=size-])]:size-4',
	'*:data-[slot=select-clear-icon]:i-lucide-x *:data-[slot=select-clear-icon]:pointer-events-none *:data-[slot=select-clear-icon]:size-4',
)
const chipRemove = '*:data-[slot=select-chip-remove]:-mr-1 *:data-[slot=select-chip-remove]:inline-flex *:data-[slot=select-chip-remove]:size-4 *:data-[slot=select-chip-remove]:shrink-0 *:data-[slot=select-chip-remove]:items-center *:data-[slot=select-chip-remove]:justify-center *:data-[slot=select-chip-remove]:rounded-full *:data-[slot=select-chip-remove]:opacity-50 *:data-[slot=select-chip-remove]:hover:opacity-100 **:data-[slot=select-chip-remove-icon]:i-lucide-x **:data-[slot=select-chip-remove-icon]:pointer-events-none **:data-[slot=select-chip-remove-icon]:size-3'

/** Unified select: single, multiple, searchable, editable, chips, and tagging by composition. */
const Select = <Multiple extends boolean = false>({ class: classes, ...attrs }: SelectArgs<Multiple>) => (
	<BaseSelect<Multiple> {...attrs} class={clx('playa-select-root', classes)} />
)

/** Button field for a Select. */
const SelectTrigger: Stateless<SelectTriggerArgs> = ({ class: classes, size = 'default', ...attrs }) => (
	<BaseSelectTrigger
		{...attrs}
		class={clx('playa-select-trigger', classes)}
		data-size={size}
	/>
)

/** Input field or in-popup search box for a Select. */
const SelectInput: Stateless<SelectInputArgs> = ({ class: classes, ...attrs }) => (
	<BaseSelectInput {...attrs} class={inputGroupVariants({ class: clx('playa-select-input', classes), width: 'auto' })} />
)

/** Button that clears the current selection and search; compose it in SelectInput. */
const SelectClear: Stateless<SelectClearArgs> = ({ class: classes, ...attrs }) => (
	<BaseSelectClear {...attrs} class={clx(clearBase, classes)} />
)

/** Popup panel for Select options. */
const SelectContent: Stateless<SelectContentArgs> = ({ class: classes, ...attrs }) => (
	<BaseSelectContent {...attrs} class={clx('playa-select-content', classes)} />
)

/** Listbox for Select options. */
const SelectList: Stateless<SelectListArgs> = ({ class: classes, ...attrs }) => (
	<BaseSelectList {...attrs} class={clx('playa-select-list scrollbar-soft', classes)} />
)

/** Selectable Select option. */
const SelectItem: Stateless<SelectItemArgs> = ({ class: classes, ...attrs }) => (
	<BaseSelectItem {...attrs} class={clx('playa-select-item', classes)} />
)

/** Label for a SelectGroup. */
const SelectLabel: Stateless<SelectLabelArgs> = ({ class: classes, ...attrs }) => (
	<BaseSelectLabel {...attrs} class={clx('playa-select-label', classes)} />
)

/** Visual separator between Select groups. */
const SelectSeparator: Stateless<SelectSeparatorArgs> = ({ class: classes, ...attrs }) => (
	<BaseSelectSeparator {...attrs} class={clx('playa-select-separator', classes)} />
)

/** Empty state shown when filtering hides every option. */
const SelectEmpty: Stateless<SelectEmptyArgs> = ({ class: classes, ...attrs }) => (
	<BaseSelectEmpty {...attrs} class={clx('playa-select-empty', classes)} />
)

/** Keep-mounted polite live region for async status. */
const SelectStatus: Stateless<SelectStatusArgs> = ({ class: classes, ...attrs }) => (
	<BaseSelectStatus {...attrs} class={clx('playa-select-status', classes)} />
)

/** Create-tag row shown while the search matches no option exactly. */
const SelectCreate: Stateless<SelectCreateArgs> = ({ class: classes, ...attrs }) => (
	<BaseSelectCreate {...attrs} class={clx('playa-select-create', classes)} />
)

/** Chip input wrapper for multiple Select selections. */
const SelectChips: Stateless<SelectChipsArgs> = ({ class: classes, ...attrs }) => (
	<BaseSelectChips {...attrs} class={clx('playa-select-chips', classes)} />
)

/** Selected chip for multiple Select usage; composes the Chip visual language. */
const SelectChip: Stateless<SelectChipArgs> = ({ class: classes, ...attrs }) => (
	<BaseSelectChip {...attrs} class={clx(chipVariants({ variant: 'secondary' }), 'has-[button]:pr-1', chipRemove, classes)} />
)

/** Input used inside SelectChips. */
const SelectChipsInput: Stateless<SelectChipsInputArgs> = ({ class: classes, ...attrs }) => (
	<BaseSelectChipsInput {...attrs} class={clx('playa-select-chips-input', classes)} />
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
