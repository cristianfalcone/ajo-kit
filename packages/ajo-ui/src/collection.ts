export type ItemsOptions = {
	/** Exclude disabled items. Default: true. */
	enabled?: boolean
	/** Require rendered layout (an offsetParent). Default: true. */
	rendered?: boolean
	/** Exclude [hidden] items. Default: true. */
	shown?: boolean
}

export type ItemAttrs = {
	'data-item': string
	'data-disabled'?: 'true'
	'data-label'?: string
	'data-value'?: string
}

type SweepOptions = {
	empty?: string
	group?: string
	separator?: string
}

const enabledOf = (item: HTMLElement) =>
	item.dataset.disabled !== 'true' && !(item as HTMLElement & { disabled?: boolean }).disabled

/**
 * One item protocol for list-like families (menus, select, combobox, command):
 * items are marked `data-item="<kind>"` and carry `data-value`, `data-label`,
 * and `data-disabled`; the kind keeps nested families from cross-matching.
 * Discovery is by DOM query (house pattern), highlight is `data-highlighted`.
 */
export const collection = (kind: string, defaults: ItemsOptions = {}) => {
	const selector = `[data-item="${kind}"]`
	const sweepDefaults: Required<SweepOptions> = {
		empty: `[data-slot="${kind}-empty"]`,
		group: `[data-slot="${kind}-group"]`,
		separator: `[data-slot="${kind}-separator"]`,
	}

	const all = (root: ParentNode | null | undefined) =>
		root ? Array.from(root.querySelectorAll<HTMLElement>(selector)) : []

	const items = (root: ParentNode | null | undefined, opts: ItemsOptions = {}) => {
		const enabled = opts.enabled ?? defaults.enabled ?? true
		const rendered = opts.rendered ?? defaults.rendered ?? true
		const shown = opts.shown ?? defaults.shown ?? true

		return all(root).filter(item =>
			(!shown || !item.hidden) &&
			(!rendered || item.offsetParent !== null) &&
			(!enabled || enabledOf(item)))
	}

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

	/** Focuses the first or last matching item. */
	const edge = (root: ParentNode | null | undefined, which: 'first' | 'last', opts?: ItemsOptions) => {
		const list = items(root, opts)
		focusItem(root, which === 'first' ? list[0] : list[list.length - 1])
	}

	/** Resolves the item containing an event target. */
	const item = (event: Event) =>
		(event.target as HTMLElement | null)?.closest<HTMLElement>(selector)

	/** Marker attrs for one item, meant for JSX spread. */
	const attrs = (opts: { disabled?: boolean; label?: string; value?: string } = {}): ItemAttrs => ({
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
	const sweep = (root: HTMLElement, opts?: SweepOptions) => {
		const empty = opts?.empty ?? sweepDefaults.empty
		const group = opts?.group ?? sweepDefaults.group
		const separator = opts?.separator ?? sweepDefaults.separator

		if (group) {
			for (const element of root.querySelectorAll<HTMLElement>(group)) {
				if (element.dataset.forceMount === 'true') {
					element.hidden = false
					continue
				}
				element.hidden = !element.querySelector<HTMLElement>(`${selector}:not([hidden])`)
			}
		}

		// A group hidden by the previous filter makes its children non-rendered.
		// Reconcile groups first so clearing the filter can measure them again.
		const visible = items(root)

		if (separator) {
			const separators = new Set(root.querySelectorAll<HTMLElement>(separator))
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
		}

		if (empty) {
			for (const element of root.querySelectorAll<HTMLElement>(empty)) {
				element.hidden = visible.length > 0
			}
		}

		return visible
	}

	return { all, attrs, clearHighlight, edge, focusItem, highlight, item, items, selector, sweep }
}

export type Collection = ReturnType<typeof collection>
