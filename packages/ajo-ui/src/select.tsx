import type { Children, IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { announce, callHandler, callRef, controlled, dom, id, listen, roving, statefulRootAttrs as rootAttrs, typeahead } from 'ajo-cloves'
import { context } from 'ajo/context'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from './input-group'
import type { FixedArgs, OmitArg } from './utils'
import { defaultResultsLabel, flag, matchesTokens, resolveFilter, text } from './utils'
import { contentAttrs, datasetPlacement, floating, triggerAttrs, type FloatingView } from './floating'
import { collection } from './collection'

/** Visual size supported by the built-in select trigger. */
export type SelectSize = 'default' | 'sm'

/** Predicate used to include an item in the current search results. */
export type SelectFilter<T = unknown> = (item: T, search: string, text: string) => boolean

/** Props for single- or multiple-selection state and search behavior. */
export type SelectArgs<T = string, Multiple extends boolean = false> = WithChildren<OmitArg<IntrinsicElements['div'], 'children' | 'defaultValue' | 'onchange'> & {
	/** Items available to SelectList render functions. */
	items?: T[]
	/** Controlled selection; null means controlled-empty. */
	value?: (Multiple extends true ? T[] : T) | null
	/** Initial selection for uncontrolled usage. */
	defaultValue?: Multiple extends true ? T[] : T
	/** Allow more than one selected item. */
	multiple?: Multiple
	/** Controlled search text. */
	inputValue?: string
	/** Initial search text for uncontrolled usage. */
	defaultInputValue?: string
	/** Called when the search text changes. */
	onInputValueChange?: (value: string, event?: Event) => void
	/** Controlled popup state. */
	open?: boolean
	/** Initial popup state for uncontrolled usage. */
	defaultOpen?: boolean
	/** Called when the popup opens or closes. */
	onOpenChange?: (open: boolean, event?: Event) => void
	/** Called when the selection changes; emits null (single) or [] (multiple) on clear. */
	onValueChange?: (value: (Multiple extends true ? T[] : T) | null, event?: Event) => void
	/** Called when the SelectCreate row is committed; the consumer owns creation. */
	onCreate?: (text: string, event?: Event) => void
	/** String view of an item: display, filter haystack, identity, and form value. */
	itemToStringValue?: (item: T) => string
	/** Item filter; null disables internal filtering for externally driven lists. */
	filter?: SelectFilter<T> | null
	/** Highlight the first visible item while filtering. */
	autoHighlight?: boolean
	/** Name for hidden form submission inputs. */
	name?: string
	/** Mark the selection as required for assistive technologies. */
	required?: boolean
	/** Disable the field, items, chips, and clear. */
	disabled?: boolean
	/** Screen-reader message for filtered result counts. */
	resultsLabel?: (count: number) => string
	/** Additional UnoCSS classes. */
	class?: string
}> & FixedArgs<'onchange'>

/** Props for the button that opens the select popup. */
export type SelectTriggerArgs = WithChildren<OmitArg<IntrinsicElements['button'], 'size'> & {
	/** Select trigger size. */
	size?: SelectSize
	/** Additional UnoCSS classes. */
	class?: string
	iconClass?: string
}>

/** Props for rendering the current selection or its placeholder. */
export type SelectValueArgs = WithChildren<IntrinsicElements['span'] & {
	/** Fallback shown when no value is selected. */
	placeholder?: Children
	/** Additional UnoCSS classes. */
	class?: string
}>

/** Props for a searchable select input and its optional controls. */
export type SelectInputArgs = WithChildren<OmitArg<IntrinsicElements['input'], 'children' | 'onchange'> & {
	/** Render the dropdown trigger inside the input group. */
	showTrigger?: boolean
	/** Render a clear button inside the input group. */
	showClear?: boolean
	/** Accessible label for the clear button. */
	clearLabel?: string
	/** Accessible label for the dropdown trigger button. */
	triggerLabel?: string
	/** Called when input text changes. */
	onValueChange?: (value: string, event: Event) => void
	/** Additional UnoCSS classes for the input group. */
	class?: string
	addonClass?: string
	buttonClass?: string
	buttonIconClass?: string
	clearButtonClass?: string
	clearIconClass?: string
	inputClass?: string
}> & FixedArgs<'onchange'>

/** Props for the button that clears the current selection. */
export type SelectClearArgs = WithChildren<IntrinsicElements['button'] & {
	/** Additional UnoCSS classes. */
	class?: string
	iconClass?: string
}>

/** Props for the positioned select popup. */
export type SelectContentArgs = WithChildren<IntrinsicElements['div'] & {
	/** Preferred side relative to the field. */
	side?: 'bottom' | 'left' | 'right' | 'top'
	/** Horizontal alignment relative to the field. */
	align?: 'center' | 'end' | 'start'
	/** Gap between anchor and content in pixels. */
	sideOffset?: number
	/** Pixel shift along the alignment axis. */
	alignOffset?: number
	/** Viewport padding used by fallback placement. */
	collisionPadding?: number
	/** Additional UnoCSS classes. */
	class?: string
	/** Inline CSS string. */
	style?: string
}>

/** Props for an option list, including item-renderer children. */
export type SelectListArgs<T = unknown> = WithChildren<OmitArg<IntrinsicElements['div'], 'children'> & {
	children?: Children | ((item: T, index: number) => Children)
	/** Additional UnoCSS classes. */
	class?: string
}>

/** Props for a selectable option and its filtering metadata. */
export type SelectItemArgs<T = unknown> = WithChildren<OmitArg<IntrinsicElements['div'], 'value'> & {
	/** Item value selected by this option. */
	value?: T
	/** Plain-text label for display, filtering, and typeahead when children are rich. */
	textValue?: string
	/** Extra searchable terms. */
	keywords?: string[]
	/** Keep mounted even when it does not match the search query. */
	forceMount?: boolean
	/** Disable activation. */
	disabled?: boolean
	/** Called when this option is selected. */
	onSelect?: (value: T, event: Event) => void
	/** Additional UnoCSS classes. */
	class?: string
	indicatorClass?: string
	indicatorIconClass?: string
}>

/** Props for grouping related select options. */
export type SelectGroupArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

/** Props for a label associated with a select option group. */
export type SelectLabelArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

/** Props for a visual separator between select options or groups. */
export type SelectSeparatorArgs = IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}

/** Props for content shown when no options match. */
export type SelectEmptyArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

/** Props for an accessible select status message. */
export type SelectStatusArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

/** Props for the option that commits the current search as a new value. */
export type SelectCreateArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

/** Props for the container of a multiple select's value chips. */
export type SelectChipsArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

/** Props for a selected-value chip and its optional remove control. */
export type SelectChipArgs<T = unknown> = WithChildren<IntrinsicElements['span'] & {
	/** Value removed by the built-in remove button. Defaults to chip text. */
	value?: T
	/** Show the built-in remove button. */
	showRemove?: boolean
	/** Accessible label for the remove button. */
	removeLabel?: string
	/** Additional UnoCSS classes. */
	class?: string
	removeClass?: string
	removeIconClass?: string
}>

/** Props for the search input composed inside a chip collection. */
export type SelectChipsInputArgs = OmitArg<IntrinsicElements['input'], 'onchange'> & {
	/** Called when input text changes. */
	onValueChange?: (value: string, event: Event) => void
	/** Additional UnoCSS classes. */
	class?: string
} & FixedArgs<'onchange'>

/** Shared props for select viewport scroll buttons. */
export type SelectScrollButtonArgs = WithChildren<IntrinsicElements['button'] & {
	/** Additional UnoCSS classes. */
	class?: string
	iconClass?: string
}>

type SelectContextValue = {
	activeId: string
	activeKey: string
	clear: (event?: Event) => void
	create: (event: Event) => void
	createVisible: boolean
	disabled: boolean
	filteredItems: unknown[]
	hasTrigger: boolean
	inputId: string
	itemId: (key: string) => string
	listId: string
	matches: (item: unknown, keywords?: string[]) => boolean
	multiple: boolean
	open: boolean
	searchInPopup: boolean
	registerLabel: (key: string, label: string) => void
	remove: (item: unknown, event?: Event) => void
	required: boolean
	search: string
	selectedKeys: Set<string>
	selectedLabels: string[]
	select: (item: unknown, event: Event) => void
	setActive: (key: string) => void
	setAnchor: (element: HTMLElement | null) => void
	setContent: (element: HTMLDivElement | null) => void
	setInput: (element: HTMLInputElement | null) => void
	setOpen: (open: boolean, event?: Event) => void
	setSearch: (value: string, event?: Event) => void
	setTrigger: (element: HTMLButtonElement | null) => void
	stringValue: (item: unknown) => string
	triggerId: string
}

const SelectContext = context<SelectContextValue | null>(null)

const fallbackString = (item: unknown): string => {
	if (item == null) return ''
	if (typeof item === 'string' || typeof item === 'number' || typeof item === 'bigint') return String(item)
	if (typeof item === 'object') {
		const record = item as Record<string, unknown>
		if (record.label != null) return text(record.label)
		if (record.value != null) return text(record.value)
	}
	return String(item)
}

const defaultFilter: SelectFilter = (_item, search, label) => matchesTokens(search, label)

const array = (value: unknown) =>
	Array.isArray(value) ? value : value == null ? [] : [value]

// The create row needs a stable collection key that no real item label can mint.
const CREATE_KEY = '\0create'

// Filtering happens through [hidden] and typeahead must resolve options while
// the popover is closed, so rendered-layout checks stay off.
const selectItems = collection('select', { rendered: false })

const SelectRoot: Stateful<SelectArgs<any, boolean>> = function* ({
	defaultInputValue,
	defaultOpen,
	defaultValue,
	inputValue,
	open,
}) {
	const selectId = id('select')
	const fallbackInputId = `${selectId}-input`
	const labels = new Map<string, string>()
	let activeKey = ''
	let disabled = false
	let input: HTMLInputElement | null = null
	let inputId = fallbackInputId
	let announceResults = false
	let lastResultCount = -1
	let onCreate: SelectArgs<any, boolean>['onCreate']
	let onInputValueChange: SelectArgs<any, boolean>['onInputValueChange']
	let onOpenChange: SelectArgs<any, boolean>['onOpenChange']
	let onValueChange: SelectArgs<any, boolean>['onValueChange']
	let pendingFocus = false
	let pendingSeed = ''
	let pendingStep = 0
	let pop: FloatingView<HTMLButtonElement, HTMLDivElement>
	const searchState = controlled<string>(this, {
		fallback: String(inputValue ?? defaultInputValue ?? ''),
		onChange: (next, event) => onInputValueChange?.(next, event),
	})
	const valueState = controlled<unknown>(this, {
		fallback: defaultValue ?? null,
		onChange: (next, event) => onValueChange?.(next as any, event),
	})
	const live = announce(this)

	const itemDomId = (key: string) => `${selectId}-item-${encodeURIComponent(key)}`

	// The in-popup search input must not anchor the popup to itself; the field
	// (outside anchor, trigger, or field input) always wins.
	const inPopup = (element: HTMLElement | null) =>
		Boolean(element && pop.content && pop.content.contains(element))

	pop = floating<HTMLButtonElement, HTMLDivElement>(this, {
		prefix: 'select',
		initialOpen: Boolean(open ?? defaultOpen),
		disabled: () => disabled,
		onOpenChange: (next, event) => onOpenChange?.(next, event),
		reference: view => {
			const outside = view.anchor && !inPopup(view.anchor) ? view.anchor : null
			return outside ?? view.trigger ?? (inPopup(input) ? null : input)
		},
		placement: datasetPlacement(() => pop.content, {
			side: 'bottom',
			align: 'start',
			sideOffset: 6,
			padding: 8,
		}),
		dismiss: {
			escape: false,
			outside: true,
			inside: view => [view.content],
			onDismiss: event => setOpen(false, event),
		},
		onSync: opened => {
			if (!opened || !pendingFocus) {
				pendingFocus = false
				pendingSeed = ''
				pendingStep = 0
				return
			}

			pendingFocus = false
			const popupInput = inPopup(input) ? input : null
			if (popupInput) {
				popupInput.focus()
				if (pendingSeed) setSearch(pendingSeed)
			} else {
				const items = selectItems.items(pop.content)
				let target = items.find(item => selectedKeySet.has(item.dataset.value ?? ''))
					?? items[0]
				// Arrow-key opening lands one step past the selection, native-select style.
				if (pendingStep && target) target = items[items.indexOf(target) + pendingStep] ?? target
				selectItems.focusItem(pop.content, target)
			}
			pendingSeed = ''
			pendingStep = 0
		},
	})

	// Focus returns to the field before the popover hides so it never drops to body.
	const restoreFocus = () => {
		const active = document.activeElement as HTMLElement | null
		if (!active || !pop.content?.contains(active)) return
		;(pop.trigger ?? input)?.focus()
	}

	const setOpen = (next: boolean, event?: Event) => {
		if (disabled && next) return
		if (next === pop.open) return
		// The in-popup search input receives focus however the popup opens.
		if (next && inPopup(input)) pendingFocus = true
		if (!next) {
			restoreFocus()
			// Closing discards the search so reopening shows the full list.
			if (!searchState.controlled) searchState.init('')
			activeKey = ''
		}
		pop.setOpen(next, event)
	}

	const setAnchor = (element: HTMLElement | null) => {
		pop.setAnchor(element)
		pop.place()
	}

	const setInput = (element: HTMLInputElement | null) => {
		input = element
		const nextInputId = element?.id || fallbackInputId
		if (nextInputId !== inputId) {
			inputId = nextInputId
			queueMicrotask(() => this.next())
		}
		pop.place()
	}

	const setTrigger = (element: HTMLButtonElement | null) => {
		const had = Boolean(pop.trigger)
		pop.setTrigger(element)
		// Trigger presence gates the listbox label; converge attributes post-mount.
		if (Boolean(element) !== had) queueMicrotask(() => this.next())
		pop.place()
	}

	const setSearch = (next: string, event?: Event) => {
		searchState.set(next, event)
		announceResults = true
		// Typing (or deleting) keeps the list open and repositioned.
		if (!pop.open) setOpen(true, event)
		else queueMicrotask(() => pop.place())
	}

	const setActive = (key: string) => {
		if (key === activeKey) return
		// Button mode mirrors hover into real focus, menu-style.
		if (!input) {
			const target = selectItems.items(this).find(item => item.dataset.value === key)
			if (target && target !== document.activeElement) selectItems.focusItem(this, target)
		}
		this.next(() => activeKey = key)
	}

	// Virtual navigation for input-owned focus; real focus roving lives in the
	// button branch through collection.focusItem.
	const nav = roving(this, {
		items: () => selectItems.items(this),
		loop: () => false,
		current: () => selectItems.items(this).find(item => item.dataset.value === activeKey),
		onMove: target => {
			activeKey = target.dataset.value ?? ''
			selectItems.highlight(this, target)
			this.next()
			queueMicrotask(() => target.scrollIntoView({ block: 'nearest' }))
		},
	})

	const focusNav = roving(this, {
		items: () => selectItems.items(this),
		onMove: (target, event) => {
			selectItems.focusItem(this, target)
			void event
		},
	})

	const ta = typeahead(this, {
		items: () => selectItems.items(this).filter(item => item.dataset.value !== CREATE_KEY),
		onMatch: (target, event) => {
			if (pop.open) {
				selectItems.focusItem(this, target)
			} else {
				// Closed typeahead commits directly, native-select style.
				target.click()
				event.preventDefault()
			}
		},
	})

	let selectedKeySet = new Set<string>()

	const chipsOf = () => Array.from(this.querySelectorAll<HTMLElement>('[data-slot="select-chip"]'))

	const rtl = () => getComputedStyle(this).direction === 'rtl'

	listen(this, 'keydown', (event: KeyboardEvent) => {
		const target = event.target as HTMLElement | null
		if (!target?.closest('[data-slot^="select"]')) return

		// Chip roving: real focus between chips, back to the input past the ends.
		if (target.dataset.slot === 'select-chip') {
			const chips = chipsOf()
			const index = chips.indexOf(target)
			const forward = rtl() ? 'ArrowLeft' : 'ArrowRight'
			const backward = rtl() ? 'ArrowRight' : 'ArrowLeft'

			if (event.key === 'Escape') {
				if (!pop.open) return
				event.preventDefault()
				setOpen(false, event)
				input?.focus()
				return
			}
			if (event.key === backward) {
				event.preventDefault()
				if (index > 0) chips[index - 1].focus()
				else input?.focus()
				return
			}
			if (event.key === forward) {
				event.preventDefault()
				if (index < chips.length - 1) chips[index + 1].focus()
				else input?.focus()
				return
			}
			if (event.key === 'Backspace' || event.key === 'Delete') {
				event.preventDefault()
				const neighbor = chips[index + 1] ?? chips[index - 1]
				const key = target.dataset.value ?? ''
				const item = array(valueState.value).find(candidate => itemKeyOf(candidate) === key)
				if (item !== undefined) removeItem(item, event)
				if (neighbor && neighbor !== target) neighbor.focus()
				else input?.focus()
				return
			}
			if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
				event.preventDefault()
				input?.focus()
				setOpen(true, event)
				return
			}
			// Printable keys and everything else bail back to the input.
			if (event.key.length === 1 || event.key === 'Enter') input?.focus()
			return
		}

		// Field trigger: the closed-state combobox for button and popup-search modes.
		if (target.closest('[data-slot="select-trigger"]')) {
			if (event.key === 'Escape') {
				if (!pop.open) return
				event.preventDefault()
				setOpen(false, event)
				pop.trigger?.focus()
				return
			}
			if (event.key === 'Tab') {
				if (pop.open) setOpen(false, event)
				return
			}
			if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
				event.preventDefault()
				if (pop.open) {
					// Mouse-opened popups keep focus on the trigger; keys still work.
					if (event.key === 'Enter' || event.key === ' ') {
						setOpen(false, event)
						return
					}
					if (inPopup(input)) {
						input?.focus()
						return
					}
					const items = selectItems.items(this)
					let target = items.find(item => selectedKeySet.has(item.dataset.value ?? '')) ?? items[0]
					if (target) target = items[items.indexOf(target) + (event.key === 'ArrowDown' ? 1 : -1)] ?? target
					selectItems.focusItem(this, target)
					return
				}
				pendingFocus = true
				pendingStep = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
				setOpen(true, event)
				return
			}
			if (inPopup(input)) {
				// Printable keys open and seed the in-popup search.
				if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && event.key !== ' ') {
					event.preventDefault()
					pendingFocus = true
					pendingSeed = event.key
					setOpen(true, event)
				}
				return
			}
			if (!input) ta.handle(event)
			return
		}

		// Any input (field, chips, in-popup): virtual focus model.
		if (target === input || target.dataset.slot === 'select-chips-input' || target.dataset.slot === 'select-input') {
			if (event.key === 'Tab') {
				if (pop.open) setOpen(false, event)
				return
			}
			if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
				if (!pop.open) setOpen(true, event)
				// Without a live highlight the first move lands on the edge, not past it.
				if (!selectItems.items(this).some(item => item.dataset.value === activeKey)) {
					event.preventDefault()
					nav.move(event.key === 'ArrowDown' ? 'first' : 'last', event)
					return
				}
				nav.handle(event)
				return
			}
			if ((event.key === 'Home' || event.key === 'End') && pop.open) {
				nav.handle(event)
				return
			}
			if (event.key === 'Enter' && pop.open && activeKey) {
				// Visible items only: a stale highlight must never commit a filtered-out option.
				const item = selectItems.items(this).find(candidate => candidate.dataset.value === activeKey)
				if (!item) return
				event.preventDefault()
				item.click()
				return
			}
			if (event.key === 'Escape') {
				if (!pop.open) return
				// Always consumed so an ancestor dialog does not also close.
				event.preventDefault()
				setOpen(false, event)
				if (inPopup(target)) pop.trigger?.focus()
				return
			}
			if (event.key === 'Backspace' && target.dataset.slot === 'select-chips-input' && !(target as HTMLInputElement).value) {
				const selected = array(valueState.value)
				if (selected.length) {
					event.preventDefault()
					removeItem(selected[selected.length - 1], event)
				}
				return
			}
			const backward = rtl() ? 'ArrowRight' : 'ArrowLeft'
			if (event.key === backward && target.dataset.slot === 'select-chips-input' && (target as HTMLInputElement).selectionStart === 0) {
				const chips = chipsOf()
				if (chips.length) {
					event.preventDefault()
					chips[chips.length - 1].focus()
				}
			}
			return
		}

		// Real-focus roving over the options (button mode, no input).
		if (target.closest('[data-slot="select-content"]')) {
			if (event.key === 'Tab') {
				setOpen(false, event)
				return
			}
			if (event.key === 'Escape') {
				event.preventDefault()
				setOpen(false, event)
				pop.trigger?.focus()
				return
			}
			if (focusNav.handle(event)) return
			if (event.key === 'Enter' || event.key === ' ') {
				const item = selectItems.item(event)
				if (!item) return
				event.preventDefault()
				item.click()
				return
			}
			if (ta.handle(event)) event.preventDefault()
		}
	})

	let itemKeyOf = (item: unknown) => fallbackString(item)

	let removeItem = (_item: unknown, _event?: Event) => {}

	for (const args of this) {
		disabled = Boolean(args.disabled)
		onCreate = args.onCreate
		onInputValueChange = args.onInputValueChange
		onOpenChange = args.onOpenChange
		onValueChange = args.onValueChange
		pop.sync(args.open == null ? undefined : Boolean(args.open))
		searchState.sync(args.inputValue === undefined ? undefined : String(args.inputValue))
		valueState.sync(args.value)

		const multiple = Boolean(args.multiple)
		const stringValue = (item: unknown) => args.itemToStringValue?.(item) ?? fallbackString(item)
		// Identity is the raw string: slugging collides on case, punctuation, and
		// non-Latin labels, and these keys also mint DOM ids.
		const itemKey = (item: unknown) => stringValue(item)
		itemKeyOf = itemKey
		const rawValue = valueState.value
		// An empty string is "no selection" for uncontrolled string selects.
		const selectedItems = multiple ? array(rawValue) : rawValue == null || rawValue === '' ? [] : [rawValue]
		const selectedKeys = new Set(selectedItems.map(itemKey))
		selectedKeySet = selectedKeys
		const search = searchState.value
		const filter = resolveFilter(args.filter, defaultFilter)
		const filtering = Boolean(input) && args.filter !== null
		const filteredItems = filtering
			? (args.items ?? []).filter(item => filter(item, search, stringValue(item)))
			: args.items ?? []
		const matches = (item: unknown, keywords: string[] = []) =>
			filtering ? filter(item, search, [stringValue(item), ...keywords].join(' ')) : true
		const label = (item: unknown) => {
			const key = itemKey(item)
			return labels.get(key) ?? stringValue(item)
		}
		const selectedLabels = selectedItems.map(label)
		const query = search.trim().toLowerCase()
		const createVisible = Boolean(onCreate) && Boolean(query) &&
			![...labels.values(), ...(args.items ?? []).map(stringValue)]
				.some(candidate => candidate.trim().toLowerCase() === query)

		if (args.autoHighlight && pop.open && filteredItems.length && !filteredItems.some(item => itemKey(item) === activeKey)) {
			activeKey = itemKey(filteredItems[0])
		}

		const commitValue = (next: unknown, event?: Event) => {
			valueState.set(next, event)
		}

		const select = (item: unknown, event: Event) => {
			if (disabled) return
			const key = itemKey(item)
			if (multiple) {
				const current = array(valueState.value)
				const exists = current.some(candidate => itemKey(candidate) === key)
				const next = exists ? current.filter(candidate => itemKey(candidate) !== key) : [...current, item]
				commitValue(next, event)
				live.polite(`${label(item)} ${exists ? 'deselected' : 'selected'}, ${next.length} selected`)
				if (!searchState.controlled) searchState.init('')
				this.next()
				queueMicrotask(() => pop.place())
				return
			}

			// Clicking the selected option again deselects it (null = the
			// controlled-empty convention) unless the selection is required.
			// Either way the click commits, and commits close.
			if (selectedKeys.has(key) && !args.required) {
				commitValue(null, event)
				live.polite(`${label(item)} deselected`)
			} else {
				commitValue(item, event)
			}
			if (!searchState.controlled) searchState.init('')
			setOpen(false, event)
			if (!input) pop.trigger?.focus()
		}

		const remove = (item: unknown, event?: Event) => {
			if (disabled) return
			const key = itemKey(item)
			const current = array(valueState.value)
			const next = current.filter(candidate => itemKey(candidate) !== key)
			commitValue(multiple ? next : null, event)
			live.polite(`${label(item)} removed, ${next.length} selected`)
			this.next()
		}
		removeItem = remove

		const clear = (event?: Event) => {
			commitValue(multiple ? [] : null, event)
			if (!searchState.controlled) searchState.init('')
			this.next()
			queueMicrotask(() => pop.place())
			input?.focus()
		}

		const create = (event: Event) => {
			if (disabled) return
			const value = search.trim()
			if (!value) return
			onCreate?.(value, event)
			if (!searchState.controlled) searchState.init('')
			this.next()
			queueMicrotask(() => pop.place())
		}

		SelectContext({
			activeId: activeKey ? itemDomId(activeKey) : '',
			activeKey,
			clear,
			create,
			createVisible,
			disabled,
			filteredItems,
			hasTrigger: Boolean(pop.trigger),
			inputId,
			itemId: itemDomId,
			listId: `${selectId}-list`,
			matches,
			multiple,
			open: pop.open,
			searchInPopup: inPopup(input),
			registerLabel: (key, itemLabel) => {
				if (labels.get(key) === itemLabel) return
				labels.set(key, itemLabel)
				if (selectedKeys.has(key)) queueMicrotask(() => this.next())
			},
			remove,
			required: Boolean(args.required),
			search,
			selectedKeys,
			selectedLabels,
			select,
			setActive,
			setAnchor,
			setContent: pop.setContent,
			setInput,
			setOpen,
			setSearch,
			setTrigger,
			stringValue,
			triggerId: pop.triggerId,
		})

		if (dom(this)) queueMicrotask(() => {
			const visible = selectItems.sweep(this)
			pop.content?.toggleAttribute('data-empty', visible.length === 0)

			// With a search field present, the empty state is strictly a
			// search result: while no query is typed (first open, or cleared
			// and reopened) an empty list renders nothing instead of a
			// misleading "not found".
			if (input && !search) {
				for (const empty of this.querySelectorAll<HTMLElement>('[data-slot="select-empty"]')) empty.hidden = true
			}

			// A highlight the filter hid must not linger in aria-activedescendant.
			if (activeKey && !visible.some(item => item.dataset.value === activeKey)) {
				this.next(() => activeKey = '')
			}

			// Stale labels (unmounted, unselected) would suppress the create row forever.
			const mounted = new Set(selectItems.all(this).map(item => item.dataset.value ?? ''))
			for (const key of labels.keys()) {
				if (!mounted.has(key) && !selectedKeySet.has(key)) labels.delete(key)
			}

			// A rendered SelectStatus owns async/result announcements.
			const status = this.querySelector('[data-slot="select-status"]')
			if (pop.open && announceResults && !status && visible.length !== lastResultCount) {
				live.polite((args.resultsLabel ?? defaultResultsLabel)(visible.length))
			}
			lastResultCount = pop.open ? visible.length : -1
			announceResults = false
		})

		yield (
			<>
				{args.name && !multiple
					? <input disabled={disabled} name={args.name} set:value={selectedItems.length ? itemKey(selectedItems[0]) : ''} type="hidden" value={selectedItems.length ? itemKey(selectedItems[0]) : ''} />
					: null}
				{args.name && multiple
					? selectedItems.map(item => (
						<input disabled={disabled} key={itemKey(item)} name={args.name} set:value={itemKey(item)} type="hidden" value={itemKey(item)} />
					))
					: null}
				{args.children}
			</>
		)
	}
}


/** Unified select: single, multiple, searchable, editable, chips, and tagging by composition. */
const Select = <T = string, Multiple extends boolean = false>({
	autoHighlight,
	children,
	class: classes,
	defaultInputValue,
	defaultOpen,
	defaultValue,
	disabled,
	filter,
	inputValue,
	itemToStringValue,
	items,
	multiple,
	name,
	onCreate,
	onInputValueChange,
	onOpenChange,
	onValueChange,
	open,
	required,
	resultsLabel,
	value,
	...attrs
}: SelectArgs<T, Multiple>) => (
	<SelectRoot
		{...rootAttrs(attrs as Record<string, unknown>)}
		autoHighlight={autoHighlight}
		defaultInputValue={defaultInputValue}
		defaultOpen={defaultOpen}
		defaultValue={defaultValue}
		disabled={disabled}
		filter={filter as SelectFilter | null | undefined}
		inputValue={inputValue}
		itemToStringValue={itemToStringValue as ((item: unknown) => string) | undefined}
		items={items}
		multiple={multiple}
		name={name}
		onCreate={onCreate}
		onInputValueChange={onInputValueChange}
		onOpenChange={onOpenChange}
		onValueChange={onValueChange as ((value: unknown, event?: Event) => void) | undefined}
		open={open}
		required={required}
		resultsLabel={resultsLabel}
		value={value}
		attr:class={classes}
		attr:data-slot="select"
	>
		{children}
	</SelectRoot>
)

/** Button field for a Select; the closed-state combobox. */
const SelectTrigger: Stateless<SelectTriggerArgs> = ({
	children,
	class: classes,
	disabled,
	iconClass,
	id: idArg,
	ref,
	size = 'default',
	type = 'button',
	'set:onclick': onClick,
	...attrs
}) => {
	const select = SelectContext()
	const disabledFlag = Boolean(disabled ?? select?.disabled)
	const empty = !select?.selectedKeys.size

	return (
		<button
			{...attrs}
			{...triggerAttrs({
				controls: select?.listId,
				expanded: Boolean(select?.open),
				haspopup: 'listbox',
				id: idArg,
				open: Boolean(select?.open),
				ref,
				setTrigger: select?.setTrigger,
				triggerId: select?.triggerId,
			})}
			aria-required={flag(select?.required)}
			class={classes}
			data-placeholder={flag(empty)}
			data-size={size}
			data-slot="select-trigger"
			disabled={disabledFlag}
			role="combobox"
			set:onclick={(event: Event) => {
				callHandler(onClick, event)
				if (event.defaultPrevented) return
				select?.setOpen(!select.open, event)
			}}
			type={type}
		>
			{children}
			<span aria-hidden="true" class={iconClass} data-slot="select-icon" />
		</button>
	)
}

/** Selected value text for a SelectTrigger. */
const SelectValue: Stateless<SelectValueArgs> = ({
	children,
	class: classes,
	placeholder,
	...attrs
}) => {
	const select = SelectContext()
	const selected = select?.selectedLabels ?? []
	const empty = !selected.length
	const content = children ?? (empty ? placeholder : selected.join(', '))

	return (
		<span
			{...attrs}
			class={classes}
			data-placeholder={flag(empty)}
			data-slot="select-value"
		>
			{content}
		</span>
	)
}

/** Input field or in-popup search box for a Select. */
const SelectInput: Stateless<SelectInputArgs> = ({
	children,
	addonClass,
	buttonClass,
	buttonIconClass,
	class: classes,
	clearButtonClass,
	clearIconClass,
	clearLabel = 'Clear selection',
	disabled,
	id: idArg,
	inputClass,
	onValueChange,
	placeholder,
	ref,
	showClear,
	showTrigger = true,
	triggerLabel = 'Show options',
	value,
	'set:oninput': onInput,
	...attrs
}) => {
	const select = SelectContext()
	const disabledFlag = Boolean(disabled ?? select?.disabled)
	const clearable = Boolean(select && (select.selectedKeys.size > 0 || select.search))
	// The in-popup search is not the field: the trigger stays the combobox.
	const searchbox = Boolean(select?.searchInPopup)
	const shown = value == null
		? select?.open || select?.search
			? select?.search ?? ''
			: select?.multiple
				? ''
				: select?.selectedLabels[0] ?? ''
		: String(value)
	const reference = (element: HTMLInputElement | null) => {
		select?.setInput(element)
		callRef(ref, element)
	}

	return (
		<InputGroup
			class={classes}
			disabled={disabledFlag}
			ref={element => {
				if (element && !element.closest('[data-slot="select-content"]')) select?.setAnchor(element)
			}}
		>
			<InputGroupInput
				{...attrs}
				aria-activedescendant={select?.activeId || undefined}
				aria-autocomplete="list"
				aria-controls={select?.listId}
				aria-expanded={searchbox ? undefined : select?.open ? 'true' : 'false'}
				aria-haspopup={searchbox ? undefined : 'listbox'}
				aria-required={flag(select?.required)}
				class={inputClass}
				data-slot="select-input"
				disabled={disabledFlag}
				id={idArg ?? select?.inputId}
				placeholder={placeholder}
				ref={reference}
				role={searchbox ? 'searchbox' : 'combobox'}
				set:onclick={(event: Event) => select?.setOpen(true, event)}
				set:onfocus={(event: FocusEvent) => select?.setOpen(true, event)}
				set:oninput={(event: Event) => {
					const next = (event.target as HTMLInputElement).value
					callHandler(onInput, event)
					if (event.defaultPrevented) return
					onValueChange?.(next, event)
					select?.setSearch(next, event)
				}}
				set:value={shown}
				type="text"
			/>
			{children}
			<InputGroupAddon align="inline-end" class={addonClass}>
				{showTrigger && !(showClear && clearable) ? (
					<InputGroupButton
						aria-controls={select?.listId}
						aria-expanded={select?.open ? 'true' : 'false'}
						aria-label={triggerLabel}
						class={buttonClass}
						data-slot="select-input-trigger"
						disabled={disabledFlag}
						set:onclick={(event: Event) => select?.setOpen(!select?.open, event)}
						type="button"
					>
						<span aria-hidden="true" class={buttonIconClass} />
					</InputGroupButton>
				) : null}
				{showClear && clearable ? (
					<InputGroupButton
						aria-label={clearLabel}
						class={clearButtonClass}
						data-slot="select-clear"
						disabled={disabledFlag}
						set:onclick={(event: Event) => select?.clear(event)}
						type="button"
					>
						<span aria-hidden="true" class={clearIconClass} />
					</InputGroupButton>
				) : null}
			</InputGroupAddon>
		</InputGroup>
	)
}

/** Button that clears the current selection and search. */
const SelectClear: Stateless<SelectClearArgs> = ({
	children,
	class: classes,
	disabled,
	iconClass,
	type = 'button',
	'set:onclick': onClick,
	...attrs
}) => {
	const select = SelectContext()
	const disabledFlag = Boolean(disabled ?? select?.disabled)

	// Nothing to clear, nothing to render.
	if (select && !select.selectedKeys.size && !select.search) return null

	return (
		<button
			{...attrs}
			aria-label={attrs['aria-label'] ?? 'Clear selection'}
			class={classes}
			data-slot="select-clear"
			disabled={disabledFlag}
			set:onclick={(event: Event) => {
				callHandler(onClick, event)
				if (event.defaultPrevented) return
				select?.clear(event)
			}}
			type={type}
		>
			{children ?? <span aria-hidden="true" class={iconClass} />}
		</button>
	)
}

/** Popup panel for Select options. */
const SelectContent: Stateless<SelectContentArgs> = ({
	align = 'start',
	alignOffset = 0,
	children,
	class: classes,
	collisionPadding = 8,
	ref,
	side = 'bottom',
	sideOffset = 6,
	style,
	...attrs
}) => {
	const select = SelectContext()

	return (
		<div
			{...attrs}
			{...contentAttrs({
				align,
				alignOffset,
				collisionPadding,
				open: Boolean(select?.open),
				popover: 'manual',
				ref,
				setContent: select?.setContent,
				side,
				sideOffset,
				style,
				tabindex: '-1',
			})}
			class={classes}
			data-slot="select-content"
		>
			{children}
		</div>
	)
}

/** Listbox for Select options; required in every composition. */
const SelectList: Stateless<SelectListArgs<any>> = ({ children, class: classes, ...attrs }) => {
	const select = SelectContext()
	const render = typeof children === 'function'
		? (select?.filteredItems ?? []).map((item, index) => (children as (item: unknown, index: number) => Children)(item, index))
		: children

	return (
		<div
			{...attrs}
			aria-labelledby={select?.hasTrigger ? select.triggerId : undefined}
			aria-multiselectable={select?.multiple ? 'true' : undefined}
			class={classes}
			data-slot="select-list"
			id={select?.listId}
			role="listbox"
		>
			{render}
		</div>
	)
}

/** Selectable Select option. */
const SelectItem: Stateless<SelectItemArgs<any>> = ({
	children,
	class: classes,
	disabled,
	forceMount,
	indicatorClass,
	indicatorIconClass,
	keywords = [],
	onSelect,
	textValue,
	value,
	...attrs
}) => {
	const select = SelectContext()
	const item = value ?? text(children)
	const key = select ? select.stringValue(item) : fallbackString(item)
	// Rich object items must not register concatenated children text as label;
	// their display string is itemToStringValue. textValue always wins.
	const label = textValue ?? (typeof item === 'string' ? text(children) : undefined)
	const selected = Boolean(select?.selectedKeys.has(key))
	const highlighted = select?.activeKey === key
	const disabledFlag = Boolean(disabled ?? select?.disabled)
	const hidden = !forceMount && select ? !select.matches(item, keywords) : false

	if (label != null) select?.registerLabel(key, label)

	return (
		<div
			{...attrs}
			{...selectItems.attrs({ disabled: disabledFlag, label: label ?? key, value: key })}
			aria-disabled={flag(disabledFlag)}
			aria-selected={selected ? 'true' : 'false'}
			class={classes}
			data-highlighted={flag(highlighted)}
			data-selected={flag(selected)}
			data-slot="select-item"
			data-state={selected ? 'checked' : 'unchecked'}
			hidden={hidden || undefined}
			id={select?.itemId(key)}
			role="option"
			set:onclick={(event: Event) => {
				if (disabledFlag) return
				onSelect?.(item, event)
				if (event.defaultPrevented) return
				select?.select(item, event)
			}}
			set:onfocus={() => select?.setActive(key)}
			set:onpointermove={() => {
				if (!disabledFlag) select?.setActive(key)
			}}
			tabindex={disabledFlag ? undefined : '-1'}
		>
			{children}
			<span aria-hidden="true" class={indicatorClass} data-selected={selected ? 'true' : 'false'} data-slot="select-item-indicator">
				<span class={indicatorIconClass} />
			</span>
		</div>
	)
}

/** Group wrapper for Select options. */
const SelectGroup: Stateless<SelectGroupArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={classes} data-slot="select-group" role="group">
		{children}
	</div>
)

/** Label for a SelectGroup. */
const SelectLabel: Stateless<SelectLabelArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={classes} data-slot="select-label">
		{children}
	</div>
)

/** Visual separator between Select groups. */
const SelectSeparator: Stateless<SelectSeparatorArgs> = ({ class: classes, ...attrs }) => (
	<div {...attrs} class={classes} data-slot="select-separator" role="separator" />
)

/** Empty state shown when filtering hides every option. */
const SelectEmpty: Stateless<SelectEmptyArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={classes} data-slot="select-empty">
		{children}
	</div>
)

/** Keep-mounted polite live region for async status; children swap. */
const SelectStatus: Stateless<SelectStatusArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} aria-live="polite" class={classes} data-slot="select-status" role="status">
		{children}
	</div>
)

/** Create-tag row: visible while the search matches no option label exactly. */
const SelectCreate: Stateless<SelectCreateArgs> = ({ children, class: classes, ...attrs }) => {
	const select = SelectContext()
	const highlighted = select?.activeKey === CREATE_KEY

	return (
		<div
			{...attrs}
			{...selectItems.attrs({ label: select?.search ?? '', value: CREATE_KEY })}
			class={classes}
			data-highlighted={flag(highlighted)}
			data-slot="select-create"
			hidden={select?.createVisible ? undefined : true}
			id={select?.itemId(CREATE_KEY)}
			role="option"
			aria-selected="false"
			set:onclick={(event: Event) => select?.create(event)}
			set:onfocus={() => select?.setActive(CREATE_KEY)}
			set:onpointermove={() => select?.setActive(CREATE_KEY)}
			tabindex="-1"
		>
			{children ?? <>Create &laquo;{select?.search}&raquo;</>}
		</div>
	)
}

/** Chip input wrapper for multiple Select selections. */
const SelectChips: Stateless<SelectChipsArgs> = ({
	children,
	class: classes,
	ref,
	...attrs
}) => {
	const select = SelectContext()
	const reference = (element: HTMLDivElement | null) => {
		select?.setAnchor(element)
		callRef(ref, element)
	}

	return (
		<div {...attrs} class={classes} data-slot="select-chips" ref={reference}>
			{children}
		</div>
	)
}

/** Selected chip for multiple Select usage. */
const SelectChip: Stateless<SelectChipArgs<any>> = ({
	children,
	class: classes,
	removeClass,
	removeLabel,
	removeIconClass,
	showRemove = true,
	value,
	...attrs
}) => {
	const select = SelectContext()
	const item = value ?? text(children)
	const key = select ? select.stringValue(item) : fallbackString(item)

	return (
		<span {...attrs} class={classes} data-slot="select-chip" data-value={key} tabindex="-1">
			{children}
			{showRemove ? (
				<button
					aria-label={removeLabel ?? `Remove ${key}`}
					class={removeClass}
					data-slot="select-chip-remove"
					disabled={select?.disabled}
					tabindex="-1"
					type="button"
					set:onclick={(event: Event) => {
						event.stopPropagation()
						select?.remove(item, event)
					}}
				>
					<span aria-hidden="true" class={removeIconClass} />
				</button>
			) : null}
		</span>
	)
}

/** Input used inside SelectChips. */
const SelectChipsInput: Stateless<SelectChipsInputArgs> = ({
	class: classes,
	disabled,
	onValueChange,
	placeholder,
	ref,
	value,
	'set:oninput': onInput,
	...attrs
}) => {
	const select = SelectContext()
	const disabledFlag = Boolean(disabled ?? select?.disabled)
	const reference = (element: HTMLInputElement | null) => {
		select?.setInput(element)
		callRef(ref, element)
	}

	return (
		<input
			{...attrs}
			aria-activedescendant={select?.activeId || undefined}
			aria-autocomplete="list"
			aria-controls={select?.listId}
			aria-expanded={select?.open ? 'true' : 'false'}
			aria-haspopup="listbox"
			aria-required={flag(select?.required)}
			class={classes}
			data-slot="select-chips-input"
			disabled={disabledFlag}
			placeholder={placeholder}
			ref={reference}
			role="combobox"
			set:onclick={(event: Event) => select?.setOpen(true, event)}
			set:onfocus={(event: FocusEvent) => select?.setOpen(true, event)}
			set:oninput={(event: Event) => {
				const next = (event.target as HTMLInputElement).value
				callHandler(onInput, event)
				if (event.defaultPrevented) return
				onValueChange?.(next, event)
				select?.setSearch(next, event)
			}}
			set:value={value == null ? select?.search ?? '' : String(value)}
			type="text"
		/>
	)
}

const scrollList = (event: Event, top: number) => {
	(event.currentTarget as HTMLElement)
		.closest<HTMLElement>('[data-slot="select-content"]')
		?.querySelector<HTMLElement>('[data-slot="select-list"]')
		?.scrollBy({ top })
}

/** Scroll button for long Select lists. */
const SelectScrollUpButton: Stateless<SelectScrollButtonArgs> = ({
	children,
	class: classes,
	iconClass,
	type = 'button',
	...attrs
}) => (
	<button
		{...attrs}
		class={classes}
		data-slot="select-scroll-up-button"
		set:onclick={(event: Event) => scrollList(event, -96)}
		type={type}
	>
		{children ?? <span aria-hidden="true" class={iconClass} />}
	</button>
)

/** Scroll button for long Select lists. */
const SelectScrollDownButton: Stateless<SelectScrollButtonArgs> = ({
	children,
	class: classes,
	iconClass,
	type = 'button',
	...attrs
}) => (
	<button
		{...attrs}
		class={classes}
		data-slot="select-scroll-down-button"
		set:onclick={(event: Event) => scrollList(event, 96)}
		type={type}
	>
		{children ?? <span aria-hidden="true" class={iconClass} />}
	</button>
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
	SelectGroup,
	SelectInput,
	SelectItem,
	SelectLabel,
	SelectList,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectSeparator,
	SelectStatus,
	SelectTrigger,
	SelectValue,
}
