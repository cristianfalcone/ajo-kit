import type { Children, IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { announce, callHandler, callRef, controlled, dom, id, listen, roving, typeahead } from 'ajo-cloves'
import { context } from 'ajo/context'
import { FieldContext } from './field'
import { InputGroup, InputGroupAddon, InputGroupButton } from './input-group'
import { collection, matchesTokens, resolveFilter, resultCount } from './collection'
import { contentAttrs, popup, type PopupPosition, type PopupView, triggerAttrs } from './popup'
import { activate, flag, rootAttrs, text } from './shared'
import { part, type FixedArgs, type OmitArg } from './utils'
export type { PopupPlacement, PopupPosition } from './popup'

/** Predicate used to include an item in the current search results; `text` joins its label and keywords. */
export type SelectFilter = (value: string, search: string, text: string) => boolean

/** Props for single- or multiple-selection state and search behavior. */
export type SelectArgs<Multiple extends boolean = false> = WithChildren<OmitArg<IntrinsicElements['div'], 'children' | 'defaultValue' | 'onchange'> & PopupPosition & {
	/** Controlled selected key, or keys when multiple; '' or [] is controlled-empty. */
	value?: Multiple extends true ? string[] : string
	/** Initial selection for uncontrolled usage. */
	defaultValue?: Multiple extends true ? string[] : string
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
	/** Called when the selection changes; emits '' (single) or [] (multiple) on clear. */
	onValueChange?: (value: Multiple extends true ? string[] : string, event?: Event) => void
	/** Called when the SelectCreate row is committed; the consumer owns creation. */
	onCreate?: (text: string, event?: Event) => void
	/** Item filter; null disables internal filtering for externally driven lists. */
	filter?: SelectFilter | null
	/** Highlight the first visible item while the list is open. */
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
export type SelectTriggerArgs = WithChildren<IntrinsicElements['button'] & {
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

/** Props for a searchable select input; children (such as SelectClear) sit in its inline-end addon. */
export type SelectInputArgs = WithChildren<OmitArg<IntrinsicElements['input'], 'children' | 'onchange' | 'value'> & {
	/** Render the dropdown trigger inside the input group. */
	showTrigger?: boolean
	/** Accessible label for the dropdown trigger button. */
	triggerLabel?: string
	/** Additional UnoCSS classes for the input group. */
	class?: string
	addonClass?: string
	buttonClass?: string
	buttonIconClass?: string
	inputClass?: string
}> & FixedArgs<'onchange' | 'value'>

/** Props for the button that clears the current selection. */
export type SelectClearArgs = WithChildren<IntrinsicElements['button'] & {
	/** Additional UnoCSS classes. */
	class?: string
	iconClass?: string
}>

/** Props for the select popup; positioning and native semantics belong to Select. */
export type SelectContentArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'hidden' | 'id' | 'popover' | 'tabindex' | 'tabIndex'> & {
	/** Additional UnoCSS classes. */
	class?: string
	/** Inline CSS declarations composed with live positioning styles. */
	style?: string
}> & FixedArgs<'gap' | 'hidden' | 'id' | 'placement' | 'popover' | 'tabindex' | 'tabIndex'>

/** Props for the option list. */
export type SelectListArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

/** Props for a selectable option and its filtering metadata. */
export type SelectItemArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'id' | 'value'> & {
	/** Key selected by this option. Defaults to its text. */
	value?: string
	/** Plain-text label for display, filtering, and typeahead when children are rich. */
	textValue?: string
	/** Extra searchable terms. */
	keywords?: string[]
	/** Keep mounted even when it does not match the search query. */
	forceMount?: boolean
	/** Disable activation. */
	disabled?: boolean
	/** Called when this option is selected. */
	onSelect?: (value: string, event: Event) => void
	/** Additional UnoCSS classes. */
	class?: string
	indicatorClass?: string
	indicatorIconClass?: string
}> & FixedArgs<'id'>

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

/** Props for a selected-value chip and its remove control. */
export type SelectChipArgs = WithChildren<IntrinsicElements['span'] & {
	/** Key removed by the remove button. Defaults to chip text. */
	value?: string
	/** Accessible label for the remove button. */
	removeLabel?: string
	/** Additional UnoCSS classes. */
	class?: string
	removeClass?: string
	removeIconClass?: string
}>

/** Props for the search input composed inside a chip collection. */
export type SelectChipsInputArgs = OmitArg<IntrinsicElements['input'], 'onchange' | 'value'> & {
	/** Additional UnoCSS classes. */
	class?: string
} & FixedArgs<'onchange' | 'value'>

type SelectContextValue = {
	activeId: string
	activeKey: string
	clear: (event?: Event) => void
	contentId: string
	contentStyle: PopupView['contentStyle']
	create: (event: Event) => void
	createVisible: boolean
	disabled: boolean
	hasTrigger: boolean
	inputId: string
	itemId: (key: string) => string
	listId: string
	matches: (key: string, text: string) => boolean
	multiple: boolean
	open: boolean
	searchInPopup: boolean
	registerLabel: (key: string, label: string) => void
	remove: (key: string, event?: Event) => void
	required: boolean
	search: string
	selectedKeys: Set<string>
	selectedLabels: string[]
	select: (key: string, event: Event) => void
	setActive: (key: string) => void
	setReference: (element: HTMLElement | null, previous?: HTMLElement | null) => void
	setContent: (element: HTMLDivElement | null) => void
	setInput: (element: HTMLInputElement | null, previous?: HTMLInputElement | null) => void
	setOpen: (open: boolean, event?: Event) => void
	setSearch: (value: string, event?: Event) => void
	setTrigger: (element: HTMLButtonElement | null) => void
	adoptTriggerId: PopupView['adoptTriggerId']
	triggerId: string
}

const SelectContext = context<SelectContextValue | null>(null)

const defaultFilter: SelectFilter = (_value, search, label) => matchesTokens(search, label)

const keysOf = (value: string | string[]) =>
	Array.isArray(value) ? value : value ? [value] : []

// The create row needs a stable collection key that no real item label can mint.
const CREATE_KEY = '\0create'

// Filtering happens through [hidden] and typeahead must resolve options while
// the popover is closed, so rendered-layout checks stay off.
const selectItems = collection('select', { rendered: false })

const SelectRoot: Stateful<SelectArgs<boolean>> = function* ({
	defaultInputValue,
	defaultOpen,
	defaultValue,
	inputValue,
	open,
}) {
	const selectId = id('select')
	const ownerDocument = dom(this) ? this.ownerDocument : null
	const inputId = `${selectId}-input`
	const labels = new Map<string, string>()
	let activeKey = ''
	let disabled = false
	let multiple = false
	let required = false
	let fieldReference: HTMLElement | null = null
	let input: HTMLInputElement | null = null
	let onCreate: SelectArgs<boolean>['onCreate']
	let onInputValueChange: SelectArgs<boolean>['onInputValueChange']
	let onOpenChange: SelectArgs<boolean>['onOpenChange']
	let onValueChange: SelectArgs<boolean>['onValueChange']
	let pop: PopupView<HTMLButtonElement, HTMLDivElement>
	const searchState = controlled<string>(this, {
		fallback: inputValue ?? defaultInputValue ?? '',
		onChange: (next, event) => onInputValueChange?.(next, event),
	})
	const valueState = controlled<string | string[]>(this, {
		fallback: defaultValue ?? '',
		onChange: (next, event) => onValueChange?.(next, event),
	})
	const live = announce(this)
	const results = resultCount(live)

	const itemDomId = (key: string) => `${selectId}-item-${encodeURIComponent(key)}`

	const label = (key: string) => labels.get(key) ?? key

	// The in-popup search input must not reference the popup to itself; the
	// external field, trigger, or field input always wins.
	const inPopup = (element: HTMLElement | null) =>
		Boolean(element && pop.content && pop.content.contains(element))

	pop = popup<HTMLButtonElement, HTMLDivElement>(this, {
		prefix: 'select',
		profile: 'select',
		initialOpen: Boolean(open ?? defaultOpen),
		disabled: () => disabled,
		onOpenChange: (next, event) => onOpenChange?.(next, event),
		source: view => dom(view.reference) ? view.reference as HTMLElement : null,
		referenceHidden: 'close',
		dismiss: {
			escape: false,
			outside: true,
			inside: view => [dom(view.reference) ? view.reference : null, view.content],
			onDismiss: event => setOpen(false, event),
		},
		onSync: opened => {
			if (!opened) finishClose()
		},
	})

	const finishClose = () => {
		// Closing discards the search so reopening shows the full list.
		if (searchState.value) searchState.init('')
		activeKey = ''
	}

	// Keyboard entry lands on the selected item, or the first one; arrow-key
	// opening lands one step past it, native-select style.
	const entryTarget = (items: HTMLElement[], step = 0) => {
		const selected = keysOf(valueState.value)
		const target = items.find(item => selected.includes(item.dataset.value ?? '')) ?? items[0]
		return step && target ? items[items.indexOf(target) + step] ?? target : target
	}

	// Once the list is revealed, focus the in-popup search (seeding it) or
	// the entry item.
	const focusAfterReveal = (seed = '', step = 0) => pop.focusAfterReveal(() => {
		if (inPopup(input)) {
			input!.focus()
			if (seed) setSearch(seed)
			return
		}
		selectItems.focusItem(pop.content, entryTarget(selectItems.items(pop.content), step))
	})

	const setOpen = (next: boolean, event?: Event) => {
		if (disabled && next) return
		if (next === pop.open) return
		if (next) {
			pop.setOpen(true, event)
			// The in-popup search input receives focus however the popup opens.
			if (inPopup(input)) focusAfterReveal()
			return
		}
		// Focus inside the list returns to the trigger, or to the field input.
		const active = ownerDocument?.activeElement
		pop.close(event, dom(active) && pop.content?.contains(active) ? pop.trigger ?? input : null)
	}

	const effectiveReference = () =>
		(inPopup(fieldReference) ? null : fieldReference)
			?? pop.trigger
			?? (inPopup(input) ? null : input)

	const syncReference = () => {
		const next = effectiveReference()
		if (pop.reference === next) return
		pop.setReference(next)
	}

	const setReference = (element: HTMLElement | null, previous?: HTMLElement | null) => {
		if (!element && previous && fieldReference !== previous) return
		fieldReference = element
		syncReference()
	}

	const setInput = (element: HTMLInputElement | null, previous?: HTMLInputElement | null) => {
		if (!element && previous && input !== previous) return
		input = element
		syncReference()
	}

	const setTrigger = (element: HTMLButtonElement | null) => {
		const had = Boolean(pop.trigger)
		pop.setTrigger(element)
		// Trigger presence gates the listbox label; converge attributes post-mount.
		if (Boolean(element) !== had) queueMicrotask(() => this.next())
		syncReference()
	}

	const setContent = (element: HTMLDivElement | null) => {
		pop.setContent(element)
		syncReference()
	}

	const setSearch = (next: string, event?: Event) => {
		searchState.set(next, event)
		results.search()
		// Typing (or deleting) keeps the list open; observation owns geometry.
		if (!pop.open) setOpen(true, event)
	}

	const setActive = (key: string) => {
		if (key === activeKey) return
		// Button mode mirrors hover into real focus, menu-style.
		if (!input) {
			const target = selectItems.items(this).find(item => item.dataset.value === key)
			if (target && target !== ownerDocument?.activeElement) selectItems.focusItem(this, target)
		}
		this.next(() => activeKey = key)
	}

	const select = (key: string, event: Event) => {
		if (disabled) return
		const current = keysOf(valueState.value)
		const selected = current.includes(key)
		if (multiple) {
			const next = selected ? current.filter(candidate => candidate !== key) : [...current, key]
			valueState.set(next, event)
			live.polite(`${label(key)} ${selected ? 'deselected' : 'selected'}, ${next.length} selected`)
			searchState.init('')
			this.next()
			return
		}

		// Clicking the selected option again deselects it unless the selection
		// is required. Either way the click commits, and commits close.
		if (selected && !required) {
			valueState.set('', event)
			live.polite(`${label(key)} deselected`)
		} else {
			valueState.set(key, event)
		}
		searchState.init('')
		setOpen(false, event)
	}

	const remove = (key: string, event?: Event) => {
		const current = keysOf(valueState.value)
		if (disabled || !current.includes(key)) return
		const next = current.filter(candidate => candidate !== key)
		valueState.set(multiple ? next : '', event)
		live.polite(`${label(key)} removed, ${next.length} selected`)
		this.next()
	}

	const clear = (event?: Event) => {
		valueState.set(multiple ? [] : '', event)
		searchState.init('')
		this.next()
		input?.focus()
	}

	const create = (event: Event) => {
		const value = searchState.value.trim()
		if (disabled || !value) return
		onCreate?.(value, event)
		searchState.init('')
		this.next()
	}

	// One option navigator: a combobox input moves a virtual highlight and
	// stops at the ends; button mode moves real focus and wraps, menu-style.
	const nav = roving(this, {
		items: () => selectItems.items(this),
		loop: () => !input,
		current: () => input ? selectItems.items(this).find(item => item.dataset.value === activeKey) : undefined,
		onMove: target => {
			if (!input) return selectItems.focusItem(this, target)
			activeKey = target.dataset.value ?? ''
			selectItems.highlight(this, target)
			this.next()
			queueMicrotask(() => target.scrollIntoView({ block: 'nearest' }))
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

	const chipsOf = () => Array.from(this.querySelectorAll<HTMLElement>('[data-slot="select-chip"]'))

	const rtl = () => ownerDocument?.defaultView?.getComputedStyle(this).direction === 'rtl'

	// Chip roving: real focus between chips and the input, wrapping past both ends.
	const chipNav = roving(this, {
		items: () => input ? [...chipsOf(), input] : chipsOf(),
		orientation: () => 'horizontal',
		dir: () => rtl() ? 'rtl' : 'ltr',
		loop: () => true,
		onMove: target => target.focus(),
	})

	listen(this, 'keydown', (event: KeyboardEvent) => {
		const target = event.target as HTMLElement | null
		if (!target?.closest('[data-slot^="select"]')) return
		// An Escape a descendant already consumed never closes the list.
		if (event.key === 'Escape' && event.defaultPrevented) return

		if (target.dataset.slot === 'select-chip') {
			if (event.key === 'Escape') {
				if (!pop.open) return
				event.preventDefault()
				setOpen(false, event)
				return
			}
			if (chipNav.handle(event)) return
			if (event.key === 'Backspace' || event.key === 'Delete') {
				event.preventDefault()
				const chips = chipsOf()
				const index = chips.indexOf(target)
				const neighbor = chips[index + 1] ?? chips[index - 1]
				remove(target.dataset.value ?? '', event)
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
				return
			}
			if (event.key === 'Tab') {
				if (pop.open) setOpen(false, event)
				return
			}
			if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
				event.preventDefault()
				const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
				if (pop.open) {
					// Mouse-opened popups keep focus on the trigger; keys still work.
					if (!step) setOpen(false, event)
					else if (inPopup(input)) input?.focus()
					else selectItems.focusItem(this, entryTarget(selectItems.items(this), step))
					return
				}
				setOpen(true, event)
				focusAfterReveal('', step)
				return
			}
			if (inPopup(input)) {
				// Printable keys open and seed the in-popup search.
				if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && event.key !== ' ') {
					event.preventDefault()
					setOpen(true, event)
					focusAfterReveal(event.key)
				}
				return
			}
			if (!input) ta.handle(event)
			return
		}

		// Any input (field, chips, in-popup): virtual focus model.
		if (target === input) {
			if (event.key === 'Tab') {
				if (pop.open) setOpen(false, event)
				return
			}
			if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
				if (!pop.open) setOpen(true, event)
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
				return
			}
			if (target.dataset.slot !== 'select-chips-input') return
			if (event.key === 'Backspace' && !input.value) {
				const selected = keysOf(valueState.value)
				if (!selected.length) return
				event.preventDefault()
				remove(selected[selected.length - 1], event)
				return
			}
			if (event.key === (rtl() ? 'ArrowRight' : 'ArrowLeft') && input.selectionStart === 0 && chipsOf().length) {
				chipNav.handle(event)
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
				return
			}
			if (nav.handle(event)) return
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

	for (const args of this) {
		disabled = Boolean(args.disabled)
		multiple = Boolean(args.multiple)
		required = Boolean(args.required)
		onCreate = args.onCreate
		onInputValueChange = args.onInputValueChange
		onOpenChange = args.onOpenChange
		onValueChange = args.onValueChange
		const wasOpen = pop.open
		const opened = pop.sync(args.open == null ? undefined : Boolean(args.open), {
			placement: args.placement,
			gap: args.gap,
		})
		if (wasOpen && !opened) finishClose()
		searchState.sync(args.inputValue)
		valueState.sync(args.value)

		const selected = keysOf(valueState.value)
		const selectedKeys = new Set(selected)
		const search = searchState.value
		const filter = resolveFilter(args.filter, defaultFilter)
		const filtering = Boolean(input) && args.filter !== null
		const query = search.trim().toLowerCase()
		const createVisible = Boolean(onCreate) && Boolean(query) &&
			![...labels.values()].some(candidate => candidate.trim().toLowerCase() === query)

		SelectContext({
			activeId: activeKey ? itemDomId(activeKey) : '',
			activeKey,
			clear,
			contentId: pop.contentId,
			contentStyle: pop.contentStyle,
			create,
			createVisible,
			disabled,
			hasTrigger: Boolean(pop.trigger),
			inputId,
			itemId: itemDomId,
			listId: `${selectId}-list`,
			matches: (key, haystack) => !filtering || filter(key, search, haystack),
			multiple,
			open: pop.open,
			searchInPopup: inPopup(input),
			registerLabel: (key, itemLabel) => {
				if (labels.get(key) === itemLabel) return
				labels.set(key, itemLabel)
				if (selectedKeys.has(key)) queueMicrotask(() => this.next())
			},
			remove,
			required,
			search,
			selectedKeys,
			selectedLabels: selected.map(label),
			select,
			setActive,
			setReference,
			setContent,
			setInput,
			setOpen,
			setSearch,
			setTrigger,
			adoptTriggerId: pop.adoptTriggerId,
			get triggerId() { return pop.triggerId },
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

			// A highlight the filter hid must not linger in aria-activedescendant;
			// autoHighlight re-seats it on the first visible item while open.
			const next = visible.some(item => item.dataset.value === activeKey)
				? activeKey
				: args.autoHighlight && pop.open ? visible[0]?.dataset.value ?? '' : ''
			if (next !== activeKey) this.next(() => activeKey = next)

			// Stale labels (unmounted, unselected) would suppress the create row forever.
			const mounted = new Set(selectItems.all(this).map(item => item.dataset.value ?? ''))
			const current = keysOf(valueState.value)
			for (const key of labels.keys()) {
				if (!mounted.has(key) && !current.includes(key)) labels.delete(key)
			}

			// A rendered SelectStatus owns async/result announcements.
			const status = this.querySelector('[data-slot="select-status"]')
			results.settle(pop.open && !status ? visible.length : -1, args.resultsLabel)
		})

		yield (
			<>
				{args.name && !multiple
					? <input disabled={disabled} name={args.name} type="hidden" value={selected[0] ?? ''} />
					: null}
				{args.name && multiple
					? selected.map(key => <input disabled={disabled} key={key} name={args.name} type="hidden" value={key} />)
					: null}
				{args.children}
			</>
		)
	}
}


/** Unified select: single, multiple, searchable, editable, chips, and tagging by composition. */
const Select = <Multiple extends boolean = false>(args: SelectArgs<Multiple>) => (
	<SelectRoot
		{...rootAttrs(args as SelectArgs<boolean>, [
			'autoHighlight', 'defaultInputValue', 'defaultOpen', 'defaultValue', 'disabled', 'filter', 'gap', 'inputValue', 'multiple', 'name',
			'onCreate', 'onInputValueChange', 'onOpenChange', 'onValueChange', 'open', 'placement', 'required', 'resultsLabel', 'value',
		])}
		attr:data-slot="select"
	/>
)

/** Button field for a Select; the closed-state combobox. Inside a Field it is the field's control. */
const SelectTrigger: Stateless<SelectTriggerArgs> = ({
	children,
	class: classes,
	disabled,
	iconClass,
	id: idArg,
	ref,
	type = 'button',
	'set:onclick': onClick,
	...attrs
}) => {
	const select = SelectContext()
	const field = FieldContext()
	const disabledFlag = Boolean(disabled ?? select?.disabled)
	const empty = !select?.selectedKeys.size
	const triggerId = idArg ?? field?.ids.control
	const adoptedId = select?.adoptTriggerId(triggerId)

	return (
		<button
			{...field?.buttonAttrs}
			{...attrs}
			{...triggerAttrs({
				controls: select?.listId,
				expanded: Boolean(select?.open),
				haspopup: 'listbox',
				id: adoptedId ?? triggerId,
				open: Boolean(select?.open),
				ref,
				setTrigger: select?.setTrigger,
				triggerId: select?.triggerId,
			})}
			aria-required={flag(select?.required)}
			class={classes}
			data-placeholder={flag(empty)}
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

/** Combobox wiring shared by SelectInput and SelectChipsInput; the in-popup search is a searchbox. */
const inputAttrs = (select: SelectContextValue | null, { disabled, onInput, ref }: {
	disabled: unknown
	onInput: unknown
	ref: unknown
}) => {
	const searchbox = Boolean(select?.searchInPopup)
	let mounted: HTMLInputElement | null = null

	return {
		'aria-activedescendant': select?.activeId || undefined,
		'aria-autocomplete': 'list',
		'aria-controls': select?.listId,
		'aria-expanded': searchbox ? undefined : select?.open ? 'true' : 'false',
		'aria-haspopup': searchbox ? undefined : 'listbox',
		'aria-required': flag(select?.required),
		disabled: Boolean(disabled ?? select?.disabled),
		ref: (element: HTMLInputElement | null) => {
			const previous = mounted
			mounted = element
			select?.setInput(element, previous)
			callRef(ref, element)
		},
		role: searchbox ? 'searchbox' : 'combobox',
		'set:onclick': (event: Event) => select?.setOpen(true, event),
		'set:onfocus': (event: FocusEvent) => select?.setOpen(true, event),
		'set:oninput': (event: Event) => {
			callHandler(onInput, event)
			if (event.defaultPrevented) return
			select?.setSearch((event.target as HTMLInputElement).value, event)
		},
		type: 'text',
	} as const
}

/** Input field or in-popup search box for a Select; children sit in its inline-end addon before the trigger. Inside a Field its input is the field's control. */
const SelectInput: Stateless<SelectInputArgs> = ({
	children,
	addonClass,
	buttonClass,
	buttonIconClass,
	class: classes,
	disabled,
	id: idArg,
	inputClass,
	ref,
	showTrigger = true,
	triggerLabel = 'Show options',
	'set:oninput': onInput,
	...attrs
}) => {
	const select = SelectContext()
	const field = FieldContext()
	const disabledFlag = Boolean(disabled ?? select?.disabled)
	const shown = select?.open || select?.search
		? select.search
		: select?.multiple
			? ''
			: select?.selectedLabels[0] ?? ''
	let group: HTMLDivElement | null = null

	return (
		<InputGroup
			class={classes}
			disabled={disabledFlag}
			ref={element => {
				const previous = group
				group = element
				if (!element || !element.closest('[data-slot="select-content"]')) {
					select?.setReference(element, previous)
				}
			}}
		>
			<input
				{...field?.controlAttrs}
				{...attrs}
				{...inputAttrs(select, { disabled, onInput, ref })}
				class={inputClass}
				data-slot="select-input"
				id={idArg ?? field?.ids.control ?? select?.inputId}
				set:value={shown}
			/>
			<InputGroupAddon align="inline-end" class={addonClass}>
				{children}
				{showTrigger ? (
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
			</InputGroupAddon>
		</InputGroup>
	)
}

/** Button that clears the current selection and search; renders only while there is something to clear. */
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
const SelectContent: Stateless<SelectContentArgs> = ({ children, class: classes, ref, style, ...attrs }) => {
	const select = SelectContext()

	return (
		<div
			{...attrs}
			{...contentAttrs({
				id: select?.contentId,
				open: Boolean(select?.open),
				ref,
				setContent: select?.setContent,
				style: select?.contentStyle(style),
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
const SelectList: Stateless<SelectListArgs> = ({ children, class: classes, ...attrs }) => {
	const select = SelectContext()

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
			{children}
		</div>
	)
}

/** Selectable Select option. */
const SelectItem: Stateless<SelectItemArgs> = ({
	children,
	disabled,
	forceMount,
	indicatorClass,
	indicatorIconClass,
	keywords = [],
	onSelect,
	textValue,
	value,
	'set:onclick': onClick,
	'set:onfocus': onFocus,
	'set:onpointermove': onPointerMove,
	...attrs
}) => {
	const select = SelectContext()
	const key = value ?? text(children)
	const label = textValue ?? (text(children) || key)
	const selected = Boolean(select?.selectedKeys.has(key))
	const highlighted = select?.activeKey === key
	const disabledFlag = Boolean(disabled ?? select?.disabled)
	const hidden = !forceMount && select ? !select.matches(key, [label, ...keywords].join(' ')) : false

	select?.registerLabel(key, label)

	return (
		<div
			{...attrs}
			{...selectItems.attrs({ disabled: disabledFlag, label, value: key })}
			aria-disabled={flag(disabledFlag)}
			aria-selected={selected ? 'true' : 'false'}
			data-highlighted={flag(highlighted)}
			data-selected={flag(selected)}
			data-slot="select-item"
			data-state={selected ? 'checked' : 'unchecked'}
			hidden={hidden || undefined}
			id={select?.itemId(key)}
			role="option"
			set:onclick={activate(disabledFlag, onClick, event => {
				onSelect?.(key, event)
				if (!event.defaultPrevented) select?.select(key, event)
			})}
			set:onfocus={activate(false, onFocus, () => select?.setActive(key))}
			set:onpointermove={activate(disabledFlag, onPointerMove, () => select?.setActive(key))}
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
const SelectGroup = part<SelectGroupArgs>('div', 'select-group', { role: 'group' })

/** Label for a SelectGroup. */
const SelectLabel = part<SelectLabelArgs>('div', 'select-label')

/** Visual separator between Select groups. */
const SelectSeparator = part<SelectSeparatorArgs>('div', 'select-separator', { role: 'separator' })

/** Empty state shown when filtering hides every option. */
const SelectEmpty = part<SelectEmptyArgs>('div', 'select-empty')

/** Keep-mounted polite live region for async status; children swap. */
const SelectStatus = part<SelectStatusArgs>('div', 'select-status', { 'aria-live': 'polite', role: 'status' })

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
	let mounted: HTMLDivElement | null = null
	const reference = (element: HTMLDivElement | null) => {
		const previous = mounted
		mounted = element
		select?.setReference(element, previous)
		callRef(ref, element)
	}

	return (
		<div {...attrs} class={classes} data-slot="select-chips" ref={reference}>
			{children}
		</div>
	)
}

/** Selected chip for multiple Select usage. */
const SelectChip: Stateless<SelectChipArgs> = ({
	children,
	class: classes,
	removeClass,
	removeLabel,
	removeIconClass,
	value,
	...attrs
}) => {
	const select = SelectContext()
	const key = value ?? text(children)

	return (
		<span {...attrs} class={classes} data-slot="select-chip" data-value={key} tabindex="-1">
			{children}
			<button
				aria-label={removeLabel ?? `Remove ${key}`}
				class={removeClass}
				data-slot="select-chip-remove"
				disabled={select?.disabled}
				tabindex="-1"
				type="button"
				set:onclick={(event: Event) => {
					event.stopPropagation()
					select?.remove(key, event)
				}}
			>
				<span aria-hidden="true" class={removeIconClass} />
			</button>
		</span>
	)
}

/** Input used inside SelectChips. */
const SelectChipsInput: Stateless<SelectChipsInputArgs> = ({
	class: classes,
	disabled,
	ref,
	'set:oninput': onInput,
	...attrs
}) => {
	const select = SelectContext()

	return (
		<input
			{...attrs}
			{...inputAttrs(select, { disabled, onInput, ref })}
			class={classes}
			data-slot="select-chips-input"
			set:value={select?.search ?? ''}
		/>
	)
}

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
	SelectSeparator,
	SelectStatus,
	SelectTrigger,
	SelectValue,
}
