import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { announce, callHandler, controlled, dom, id, listen, roving } from 'ajo-cloves'
import { context } from 'ajo/context'
import { activate, flag, rootAttrs, text } from './shared'
import { part, type FixedArgs, type OmitArg } from './utils'
import { collection, matchesTokens, resolveFilter, resultCount } from './collection'

/** Predicate used to match a command item against the current search. */
export type CommandFilter = (value: string, search: string, keywords: string[]) => boolean

/** Arguments for the searchable Command collection root. */
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

/** Arguments for the search input bound to a Command root; Command `search` owns its value. */
export type CommandInputArgs = OmitArg<IntrinsicElements['input'], 'onchange' | 'value'> & {
	/** Additional UnoCSS classes. */
	class?: string
} & FixedArgs<'onchange' | 'value'>

/** Arguments for the Command listbox container. */
export type CommandListArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

/** Arguments for content shown when no command item matches. */
export type CommandEmptyArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

/** Arguments for a labelled group of command items. */
export type CommandGroupArgs = WithChildren<IntrinsicElements['div'] & {
	/** Group heading. */
	heading?: string
	/** Keep the group mounted and visible even when all child items are filtered out. */
	forceMount?: boolean
	/** Additional UnoCSS classes. */
	class?: string
}>

/** Arguments for a visual separator between command groups. */
export type CommandSeparatorArgs = IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}

/** Arguments for one selectable and filterable command item. */
export type CommandItemArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'id' | 'value'> & {
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
}> & FixedArgs<'id'>

/** Arguments for shortcut text displayed beside a command item. */
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
	let disabled = false
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
	const results = resultCount(announce(this))

	const itemId = (itemValue: string) => `${commandId}-item-${encodeURIComponent(itemValue)}`

	const setValue = (next: string, event?: Event) => {
		if (next === valueState.value) return
		valueState.set(next, event)
	}

	const setSearch = (next: string, event: Event) => {
		if (next === searchState.value) return
		searchState.set(next, event)
		results.search()
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

			results.settle(visible.length, resultsLabel)
		})

		yield <>{args.children}</>
	}
}


/** Searchable command menu. */
const Command: Stateless<CommandArgs> = args => (
	<CommandRoot
		{...rootAttrs(args, ['defaultSearch', 'defaultValue', 'disabled', 'filter', 'loop', 'onSearchChange', 'onValueChange', 'resultsLabel', 'search', 'value'])}
		attr:data-slot="command"
	/>
)

/** Search input for a Command menu. */
const CommandInput: Stateless<CommandInputArgs> = ({
	class: classes,
	disabled,
	placeholder = 'Type a command or search...',
	type: _type,
	'set:oninput': onInput,
	...attrs
}) => {
	const command = CommandContext()
	const disabledFlag = Boolean(disabled ?? command?.disabled)

	return (
		<div data-slot="command-input-wrapper">
			<span aria-hidden="true" data-slot="command-input-icon" />
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
					callHandler(onInput, event)
					if (event.defaultPrevented) return
					command?.setSearch((event.target as HTMLInputElement).value, event)
				}}
				set:value={command?.search ?? ''}
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
const CommandEmpty = part<CommandEmptyArgs>('div', 'command-empty')

/** Group of related command items. */
const CommandGroup: Stateless<CommandGroupArgs> = ({
	children,
	class: classes,
	forceMount,
	heading,
	...attrs
}) => (
	<div
		{...attrs}
		class={classes}
		data-force-mount={flag(forceMount)}
		data-slot="command-group"
		role="group"
	>
		{heading ? <div data-slot="command-group-heading">{heading}</div> : null}
		{children}
	</div>
)

/** Visual separator between command groups. */
const CommandSeparator = part<CommandSeparatorArgs>('div', 'command-separator', { role: 'separator' })

/** Selectable command option. */
const CommandItem: Stateless<CommandItemArgs> = ({
	children,
	disabled,
	forceMount,
	keywords = [],
	onSelect,
	value,
	'set:onclick': onClick,
	'set:onpointermove': onPointerMove,
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
			data-highlighted={flag(highlighted)}
			data-slot="command-item"
			hidden={hidden || undefined}
			id={command?.itemId(itemValue)}
			role="option"
			set:onclick={activate(disabledFlag, onClick, event => {
				onSelect?.(itemValue, event)
				if (!event.defaultPrevented) command?.setValue(itemValue, event)
			})}
			set:onpointermove={activate(disabledFlag, onPointerMove, event => command?.setValue(itemValue, event))}
		>
			{children}
		</div>
	)
}

/** Right-aligned shortcut hint inside a CommandItem. */
const CommandShortcut = part<CommandShortcutArgs>('span', 'command-shortcut')

export {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
}
