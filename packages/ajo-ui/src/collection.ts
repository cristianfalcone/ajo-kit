const enabledOf = (item: HTMLElement) =>
	item.dataset.disabled !== 'true' && !(item as HTMLElement & { disabled?: boolean }).disabled

/** Token match: every whitespace-separated search token appears in the haystack, case-insensitive; an empty search matches. */
export const matchesTokens = (search: string, haystack: string) => {
	const query = search.trim().toLowerCase()
	if (!query) return true
	const target = haystack.trim().toLowerCase()
	return query.split(/\s+/).every(part => target.includes(part))
}

/** Formats the default English result count for filterable collections. */
export const defaultResultsLabel = (count: number) =>
	`${count} result${count === 1 ? '' : 's'}`

const passAll = () => true

/** Resolves undefined to the built-in filter, null to unfiltered, and preserves a custom filter. */
export const resolveFilter = <Args extends unknown[]>(
	filter: ((...args: Args) => boolean) | null | undefined,
	fallback: (...args: Args) => boolean,
): ((...args: Args) => boolean) =>
	filter === undefined ? fallback : filter ?? passAll

/**
 * One item protocol for list-like families (menus, select, combobox, command):
 * items are marked `data-item="<kind>"` and carry `data-value`, `data-label`,
 * and `data-disabled`; the kind keeps nested families from cross-matching.
 * Discovery is by DOM query (house pattern), highlight is `data-highlighted`.
 */
export const collection = (kind: string, { rendered = true }: { rendered?: boolean } = {}) => {
	const selector = `[data-item="${kind}"]`

	const all = (root: ParentNode | null | undefined) =>
		root ? Array.from(root.querySelectorAll<HTMLElement>(selector)) : []

	/** Shown, enabled items; rendered layout is required unless the collection opts out. */
	const items = (root: ParentNode | null | undefined) =>
		all(root).filter(item =>
			!item.hidden &&
			(!rendered || item.offsetParent !== null) &&
			enabledOf(item))

	const clearHighlight = (root: ParentNode | null | undefined) => {
		for (const item of all(root)) delete item.dataset.highlighted
	}

	/** Marks one item highlighted and clears the rest; does not move focus. */
	const highlight = (root: ParentNode | null | undefined, target: HTMLElement | undefined) => {
		if (!target) return

		target.dataset.highlighted = 'true'
		for (const item of all(root)) {
			if (item !== target) delete item.dataset.highlighted
		}
	}

	/** Focus strategy: moves real focus and mirrors it in data-highlighted. */
	const focusItem = (root: ParentNode | null | undefined, target: HTMLElement | undefined) => {
		if (!target || !(root instanceof Node) || !root.contains(target)) return

		target.focus()
		highlight(root, target)
	}

	/** Resolves the item containing an event target. */
	const item = (event: Event) =>
		(event.target as HTMLElement | null)?.closest<HTMLElement>(selector)

	/** Marker attrs for one item, meant for JSX spread. */
	const attrs = (opts: { disabled?: boolean; label?: string; value?: string } = {}) => ({
		'data-item': kind,
		'data-disabled': opts.disabled ? 'true' : undefined,
		'data-label': opts.label,
		'data-value': opts.value,
	})

	/**
	 * Hides empty groups (respecting data-force-mount) and toggles empty
	 * states against the current visible set; returns the visible items.
	 * Separators survive only between visible items: leading, trailing,
	 * and stacked separators hide as filtering empties their groups.
	 */
	const sweep = (root: HTMLElement) => {
		for (const group of root.querySelectorAll<HTMLElement>(`[data-slot="${kind}-group"]`)) {
			group.hidden = group.dataset.forceMount !== 'true' && !group.querySelector(`${selector}:not([hidden])`)
		}

		// A group hidden by the previous filter makes its children non-rendered.
		// Reconcile groups first so clearing the filter can measure them again.
		const visible = items(root)

		const separators = new Set(root.querySelectorAll<HTMLElement>(`[data-slot="${kind}-separator"]`))
		const order = [...visible, ...separators].sort((a, b) =>
			a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)
		const keep = new Set<HTMLElement>()

		let afterItem = false
		for (const element of order) {
			if (!separators.has(element)) { afterItem = true; continue }
			if (afterItem) keep.add(element)
			afterItem = false
		}

		let beforeItem = false
		for (let index = order.length - 1; index >= 0; index--) {
			const element = order[index]
			if (!separators.has(element)) { beforeItem = true; continue }
			if (!beforeItem) keep.delete(element)
		}

		for (const separator of separators) separator.hidden = !keep.has(separator)

		for (const empty of root.querySelectorAll<HTMLElement>(`[data-slot="${kind}-empty"]`)) {
			empty.hidden = visible.length > 0
		}

		return visible
	}

	return { all, attrs, clearHighlight, focusItem, highlight, item, items, sweep }
}
