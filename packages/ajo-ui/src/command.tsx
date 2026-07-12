import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { announce, callHandler, controlled, dom, id, listen, roving, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'
import type { FixedArgs, OmitArg } from './utils'
import { defaultResultsLabel, flag, matchesTokens, resolveFilter, text } from './utils'
import { collection } from './collection'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogTitle,
	type DialogContentArgs,
} from './dialog'

export type CommandFilter = (value: string, search: string, keywords: string[]) => boolean

export type CommandArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'onchange'> & {
	/** Controlled selected item value. */
	value?: string
	/** Initial selected item value for uncontrolled usage. */
	defaultValue?: string
	/** Controlled search query. */
	search?: string
	/** Initial search query for uncontrolled usage. */
	defaultSearch?: string
	/** Disable every command item and input. */
	disabled?: boolean
	/** Item filter; null disables internal filtering for externally driven lists. */
	filter?: CommandFilter | null
	/** Wrap keyboard navigation at the ends. Default: true. */
	loop?: boolean
	/** Called whenever the selected item value changes. */
	onValueChange?: (value: string, event?: Event) => void
	/** Called whenever the search query changes. */
	onSearchChange?: (search: string, event?: Event) => void
	/** Screen-reader message for filtered result counts. */
	resultsLabel?: (count: number) => string
	/** Additional UnoCSS classes. */
	class?: string
}> & FixedArgs<'onchange'>

export type CommandDialogArgs = WithChildren<OmitArg<IntrinsicElements['dialog'], 'open'> & {
	/** Controlled dialog open state. */
	open?: boolean
	/** Initial open state for uncontrolled usage. */
	defaultOpen?: boolean
	/** Called whenever the dialog opens or closes. */
	onOpenChange?: (open: boolean, event?: Event) => void
	/** Called when Escape requests dialog close. Prevent default to keep it open. */
	onEscapeKeyDown?: DialogContentArgs['onEscapeKeyDown']
	/** Called when the native backdrop is clicked. Prevent default to keep it open. */
	onPointerDownOutside?: DialogContentArgs['onPointerDownOutside']
	/** Accessible dialog title. */
	title?: string
	/** Accessible dialog description. */
	description?: string
	/** Show the default close button. */
	showCloseButton?: boolean
	/** Accessible label for the default close button. */
	closeLabel?: string
	/** Additional UnoCSS classes for dialog content. */
	class?: string
	commandClass?: string
	closeClass?: string
	closeIconClass?: string
	descriptionClass?: string
	titleClass?: string
}>

export type CommandInputArgs = OmitArg<IntrinsicElements['input'], 'onchange'> & {
	/** Controlled input value. Prefer Command `search` for root-level control. */
	value?: string
	/** Called whenever the input value changes. */
	onValueChange?: (value: string, event: Event) => void
	/** Additional UnoCSS classes. */
	class?: string
	iconClass?: string
	wrapperClass?: string
} & FixedArgs<'onchange'>

export type CommandListArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type CommandEmptyArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type CommandGroupArgs = WithChildren<IntrinsicElements['div'] & {
	/** Group heading. */
	heading?: string
	/** Keep the group mounted and visible even when all child items are filtered out. */
	forceMount?: boolean
	/** Additional UnoCSS classes. */
	class?: string
	headingClass?: string
}>

export type CommandSeparatorArgs = IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}

export type CommandItemArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'value'> & {
	/** Stable value used for filtering, selection, and onSelect. */
	value?: string
	/** Extra searchable terms. */
	keywords?: string[]
	/** Keep mounted and visible even when it does not match the search query. */
	forceMount?: boolean
	/** Disable activation. */
	disabled?: boolean
	/** Called when this command item is selected by click or Enter. */
	onSelect?: (value: string, event: Event) => void
	/** Additional UnoCSS classes. */
	class?: string
}>

export type CommandShortcutArgs = WithChildren<IntrinsicElements['span'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

type CommandContextValue = {
	activeId: string
	disabled: boolean
	itemId: (value: string) => string
	listId: string
	matches: (value: string, keywords?: string[]) => boolean
	search: string
	setValue: (value: string, event?: Event) => void
	setSearch: (search: string, event: Event) => void
	value: string
}

const CommandContext = context<CommandContextValue | null>(null)

const defaultFilter: CommandFilter = (value, search, keywords) =>
	matchesTokens(search, [value, ...keywords].join(' '))

const commandItems = collection('command')

const CommandRoot: Stateful<CommandArgs> = function* ({ defaultSearch, defaultValue, search, value }) {
	const commandId = id('command')
	let announceResults = false
	let disabled = false
	let lastResultCount = -1
	let loop = true
	let onSearchChange: CommandArgs['onSearchChange']
	let onValueChange: CommandArgs['onValueChange']
	let resultsLabel: CommandArgs['resultsLabel']
	const valueState = controlled<string>(this, {
		fallback: String(value ?? defaultValue ?? ''),
		onChange: (next, event) => onValueChange?.(next, event),
	})
	const searchState = controlled<string>(this, {
		fallback: String(search ?? defaultSearch ?? ''),
		onChange: (next, event) => onSearchChange?.(next, event),
	})
	const live = announce(this)

	const itemId = (itemValue: string) => `${commandId}-item-${encodeURIComponent(itemValue)}`

	const setValue = (next: string, event?: Event) => {
		if (next === valueState.value) return
		valueState.set(next, event)
	}

	const setSearch = (next: string, event: Event) => {
		if (next === searchState.value) return
		searchState.set(next, event)
		announceResults = true
	}

	const nav = roving(this, {
		items: () => commandItems.items(this),
		loop: () => loop,
		current: () => commandItems.items(this).find(item => item.dataset.value === valueState.value),
		onMove: (target, event) => {
			setValue(target.dataset.value ?? '', event)
			target.scrollIntoView({ block: 'nearest' })
		},
	})

	listen(this, 'keydown', (event: KeyboardEvent) => {
		const target = event.target as HTMLElement | null
		if (!target?.closest('[data-slot="command"]')) return

		if (nav.handle(event)) return

		if (event.key === 'Enter') {
			// Visible items only: a highlight the filter hid must never commit.
			const item = commandItems.items(this).find(candidate => candidate.dataset.value === valueState.value)
			if (!item) return
			event.preventDefault()
			item.click()
		} else if (event.key === 'Escape') {
			if (!searchState.value) return
			event.preventDefault()
			setSearch('', event)
		}
	})

	for (const args of this) {
		disabled = Boolean(args.disabled)
		loop = args.loop !== false
		onSearchChange = args.onSearchChange
		onValueChange = args.onValueChange
		resultsLabel = args.resultsLabel
		searchState.sync(args.search != null ? String(args.search) : undefined)
		valueState.sync(args.value != null ? String(args.value) : undefined)

		const filter = resolveFilter(args.filter, defaultFilter)
		const matches = (itemValue: string, keywords: string[] = []) =>
			filter(itemValue, searchState.value, keywords)

		CommandContext({
			activeId: valueState.value ? itemId(valueState.value) : '',
			disabled,
			itemId,
			listId: `${commandId}-list`,
			matches,
			search: searchState.value,
			setValue,
			setSearch,
			value: valueState.value,
		})

		// The render owns highlight attrs; this microtask only sweeps structure
		// and clears staleness the filter introduced.
		if (dom(this)) queueMicrotask(() => {
			const visible = commandItems.sweep(this)

			// Selection follows highlight: an uncontrolled value the filter hid
			// re-seats on the first visible item.
			if (!valueState.controlled) {
				const next = visible.find(item => item.dataset.value === valueState.value) ?? visible[0]
				const nextValue = next?.dataset.value ?? ''
				if (nextValue !== valueState.value) valueState.init(nextValue)
			}

			if (announceResults && visible.length !== lastResultCount) {
				live.polite((resultsLabel ?? defaultResultsLabel)(visible.length))
			}
			lastResultCount = visible.length
			announceResults = false
		})

		yield <>{args.children}</>
	}
}


/** Searchable command menu. */
const Command: Stateless<CommandArgs> = ({
	children,
	class: classes,
	defaultSearch,
	defaultValue,
	disabled,
	filter,
	loop,
	onSearchChange,
	onValueChange,
	resultsLabel,
	search,
	value,
	...attrs
}) => (
	<CommandRoot
		{...rootAttrs(attrs)}
		defaultSearch={defaultSearch}
		defaultValue={defaultValue}
		disabled={disabled}
		filter={filter}
		loop={loop}
		onSearchChange={onSearchChange}
		onValueChange={onValueChange}
		resultsLabel={resultsLabel}
		search={search}
		value={value}
		attr:class={classes}
		attr:data-slot="command"
	>
		{children}
	</CommandRoot>
)

/** Native dialog wrapper for a Command palette. */
const CommandDialog: Stateless<CommandDialogArgs> = ({
	children,
	class: classes,
	defaultOpen,
	description,
	commandClass,
	onOpenChange,
	open,
	showCloseButton,
	closeClass,
	closeIconClass,
	closeLabel = 'Close',
	descriptionClass,
	onEscapeKeyDown,
	title,
	titleClass,
	onPointerDownOutside,
	...attrs
}) => (
	<Dialog
		defaultOpen={defaultOpen}
		onOpenChange={onOpenChange}
		open={open}
		class="contents"
	>
		<DialogContent
			{...attrs}
			class={classes}
			data-slot="command-dialog"
			onEscapeKeyDown={onEscapeKeyDown}
			onPointerDownOutside={onPointerDownOutside}
		>
			<div class={titleClass}>
				<DialogTitle>{title ?? 'Command Palette'}</DialogTitle>
				<DialogDescription class={descriptionClass}>
					{description ?? 'Search for a command to run...'}
				</DialogDescription>
			</div>
			{showCloseButton !== false ? (
				<DialogClose aria-label={closeLabel} class={closeClass}>
					<span aria-hidden="true" class={closeIconClass} />
				</DialogClose>
			) : null}
			<Command class={commandClass}>
				{children}
			</Command>
		</DialogContent>
	</Dialog>
)

/** Search input for a Command menu. */
const CommandInput: Stateless<CommandInputArgs> = ({
	class: classes,
	disabled,
	iconClass,
	onValueChange,
	placeholder = 'Type a command or search...',
	type: _type,
	value,
	wrapperClass,
	'set:oninput': onInput,
	...attrs
}) => {
	const command = CommandContext()
	const disabledFlag = Boolean(disabled ?? command?.disabled)
	const shown = value == null ? command?.search ?? '' : String(value)

	return (
		<div class={wrapperClass} data-slot="command-input-wrapper">
			<span aria-hidden="true" class={iconClass} />
			<input
				{...attrs}
				aria-activedescendant={command?.activeId || undefined}
				aria-autocomplete="list"
				aria-controls={command?.listId}
				aria-expanded="true"
				class={classes}
				data-slot="command-input"
				disabled={disabledFlag}
				placeholder={placeholder}
				role="combobox"
				set:oninput={(event: Event) => {
					const next = (event.target as HTMLInputElement).value
					callHandler(onInput, event)
					if (event.defaultPrevented) return
					onValueChange?.(next, event)
					command?.setSearch(next, event)
				}}
				set:value={shown}
				type="search"
			/>
		</div>
	)
}

/** Scrollable list for command options. */
const CommandList: Stateless<CommandListArgs> = ({ children, class: classes, ...attrs }) => {
	const command = CommandContext()

	return (
		<div
			{...attrs}
			class={classes}
			data-slot="command-list"
			id={command?.listId}
			role="listbox"
		>
			{children}
		</div>
	)
}

/** Empty state shown when filtering hides every command item. */
const CommandEmpty: Stateless<CommandEmptyArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={classes} data-slot="command-empty">
		{children}
	</div>
)

/** Group of related command items. */
const CommandGroup: Stateless<CommandGroupArgs> = ({
	children,
	class: classes,
	forceMount,
	heading,
	headingClass,
	...attrs
}) => (
	<div
		{...attrs}
		class={classes}
		data-force-mount={flag(forceMount)}
		data-slot="command-group"
		role="group"
	>
		{heading ? <div class={headingClass} data-slot="command-group-heading">{heading}</div> : null}
		{children}
	</div>
)

/** Visual separator between command groups. */
const CommandSeparator: Stateless<CommandSeparatorArgs> = ({ class: classes, ...attrs }) => (
	<div {...attrs} class={classes} data-slot="command-separator" role="separator" />
)

/** Selectable command option. */
const CommandItem: Stateless<CommandItemArgs> = ({
	children,
	class: classes,
	disabled,
	forceMount,
	id: idArg,
	keywords = [],
	onSelect,
	value,
	...attrs
}) => {
	const command = CommandContext()
	const itemValue = String(value ?? text(children))
	const disabledFlag = Boolean(disabled ?? command?.disabled)
	const hidden = !forceMount && command ? !command.matches(itemValue, keywords) : false
	const highlighted = command?.value === itemValue

	return (
		<div
			{...attrs}
			{...commandItems.attrs({ disabled: disabledFlag, value: itemValue })}
			aria-disabled={flag(disabledFlag)}
			aria-selected={highlighted ? 'true' : 'false'}
			class={classes}
			data-highlighted={flag(highlighted)}
			data-slot="command-item"
			hidden={hidden || undefined}
			id={idArg ?? command?.itemId(itemValue)}
			role="option"
			set:onclick={(event: Event) => {
				if (disabledFlag) return
				onSelect?.(itemValue, event)
				if (event.defaultPrevented) return
				command?.setValue(itemValue, event)
			}}
			set:onpointermove={(event: Event) => {
				if (disabledFlag) return
				command?.setValue(itemValue, event)
			}}
		>
			{children}
		</div>
	)
}

/** Right-aligned shortcut hint inside a CommandItem. */
const CommandShortcut: Stateless<CommandShortcutArgs> = ({ children, class: classes, ...attrs }) => (
	<span {...attrs} class={classes} data-slot="command-shortcut">
		{children}
	</span>
)

export {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
}
