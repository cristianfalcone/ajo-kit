import type { Children, IntrinsicElements, Stateful } from 'ajo'
import { announce, dom, listen, timer } from 'ajo-cloves'
import { Checkbox } from './checkbox'
import { defaultResultsLabel } from './collection'
import {
	createDataTableModel,
	type DataTableCellView,
	type DataTableRowView,
} from './data-table-model'
import {
	Menu,
	MenuCheckboxItem,
	MenuContent,
	MenuLabel,
	MenuSeparator,
	MenuTrigger,
} from './menu'
import { Toolbar } from './toolbar'
import type { FixedArgs, OmitArg } from './utils'
import { rootAttrs } from './shared'

export type DataTableKey = number | string
export type DataTableData = any[] | Record<string, any>

type DataTableScalar = boolean | number | string | null | undefined

type DataTableCellContext = {
	readonly columnId: string
	readonly sourceIndex: number
	readonly value: unknown
}

type DataTableFacet<T extends DataTableData> = {
	readonly label: string
	readonly options: readonly {
		readonly icon?: Children
		readonly label: string
		readonly value: string
	}[]
	readonly values?: (row: T, sourceIndex: number) => string | readonly string[]
}

type DataTableColumnBase = {
	/** Plain accessible name used by menus, sorting, and announcements. */
	readonly label: string
	/** Visual header content. Defaults to `label`. */
	readonly header?: Children
	readonly align?: 'center' | 'left' | 'right'
	readonly defaultHidden?: boolean
	readonly hideable?: boolean
}

type DataTableValue<T extends DataTableData> =
	| { readonly id?: string; readonly value: keyof T & string }
	| { readonly id: string; readonly value: (row: T, sourceIndex: number) => unknown }

type DataTableValueColumn<T extends DataTableData> = DataTableColumnBase & DataTableValue<T> & {
	readonly cell?: (row: T, context: DataTableCellContext) => Children
	readonly sort?: false | ((left: T, right: T) => number)
	readonly search?: false | ((row: T, sourceIndex: number) => DataTableScalar)
	readonly facet?: DataTableFacet<T>
}

type DataTableDisplayColumn<T extends DataTableData> = DataTableColumnBase & {
	readonly id: string
	readonly value?: never
	readonly cell: (row: T, context: DataTableCellContext) => Children
	readonly sort?: false
	readonly search?: false
	readonly facet?: never
}

/** A stable Ajo column schema; engine implementation details stay private. */
export type DataTableColumn<T extends DataTableData> = DataTableDisplayColumn<T> | DataTableValueColumn<T>

type DataTableSelectionChange<Key extends DataTableKey> = (
	keys: readonly Key[],
	event?: Event,
) => void

type DataTableSelection<T extends DataTableData, Key extends DataTableKey = DataTableKey> = {
	getRowLabel: (row: T, sourceIndex: number) => string
} & (
	| {
		value: readonly Key[]
		defaultValue?: readonly Key[]
		onValueChange: DataTableSelectionChange<Key>
	}
	| {
		value?: undefined
		defaultValue?: readonly Key[]
		onValueChange?: DataTableSelectionChange<Key>
	}
)

type DataTablePagination = {
	defaultSize?: number
	sizes?: readonly number[]
}

type DataTableSortName = 'ascending' | 'descending' | 'none'

/** Parts DataTable renders from other families, themed through `classNames`. */
type DataTableClassName =
	| 'checkbox'
	| 'checkbox_indicator'
	| 'checkbox_input'
	| 'menu'
	| 'menu_content'
	| 'menu_indicator'
	| 'menu_indicator_icon'
	| 'menu_item'
	| 'menu_label'
	| 'menu_separator'
	| 'page_size'

type DataTableLabels = {
	columns: string
	deselectPage: string
	deselectResults: string
	deselectRow: (rowLabel: string) => string
	firstPage: string
	lastPage: string
	nextPage: string
	page: (page: number, pages: number) => string
	pagination: (tableLabel: string) => string
	previousPage: string
	reset: string
	results: (count: number) => string
	rowsPerPage: string
	search: string
	selectPage: string
	selectResults: string
	selectRow: (rowLabel: string) => string
	selected: (selected: number, sourceTotal: number) => string
	sort: (columnLabel: string, next: DataTableSortName) => string
	toolbar: (tableLabel: string) => string
}

/** Arguments for the client-side, paginated DataTable strategy. */
export type DataTableArgs<
	T extends DataTableData = Record<string, unknown>,
	Key extends DataTableKey = DataTableKey,
> = OmitArg<
	IntrinsicElements['div'],
	'aria-label' | 'aria-labelledby' | 'children' | 'data-slot'
> & FixedArgs<
	'aria-label'
	| 'aria-labelledby'
	| 'attr:aria-label'
	| 'attr:aria-labelledby'
	| 'attr:data-slot'
	| 'children'
	| 'data-slot'
	| 'set:ariaLabel'
	| 'set:ariaLabelledByElements'
> & {
	/** Plain accessible name applied to the native table element. */
	label: string
	/** Immutable ordered logical collection. */
	rows: readonly T[]
	/** Stable unique identity across filter, sort, page, and refresh. */
	getRowKey: (row: T, sourceIndex: number) => Key
	/** Immutable column schema with stable IDs. */
	columns: readonly DataTableColumn<T>[]
	/** Opt-in global search. */
	search?: { placeholder?: string }
	/** Presence enables key-first row selection. */
	selection?: DataTableSelection<T, Key>
	/** Pagination is enabled by default; false renders every filtered row. */
	pagination?: false | DataTablePagination
	/** Class names for the menu, checkbox and page-size parts no caller composes. */
	classNames?: Partial<Record<DataTableClassName, string>>
	empty?: Children
	labels?: Partial<DataTableLabels>
	children?: never
}

type DataTableRootArgs<T extends DataTableData, Key extends DataTableKey> = Pick<
	DataTableArgs<T, Key>,
	'classNames' | 'columns' | 'empty' | 'getRowKey' | 'label' | 'labels' | 'pagination' | 'rows' | 'search' | 'selection'
>

type FocusTarget = { column?: string; row: string }

const defaultLabels: DataTableLabels = {
	columns: 'Columns',
	deselectPage: 'Deselect page',
	deselectResults: 'Deselect filtered results',
	deselectRow: row => `Deselect ${row}`,
	firstPage: 'First page',
	lastPage: 'Last page',
	nextPage: 'Next page',
	page: (page, pages) => `Page ${page} of ${pages}`,
	pagination: table => `${table} pagination`,
	previousPage: 'Previous page',
	reset: 'Reset',
	results: defaultResultsLabel,
	rowsPerPage: 'Rows per page',
	search: 'Search',
	selectPage: 'Select page',
	selectResults: 'Select filtered results',
	selectRow: row => `Select ${row}`,
	selected: (selected, total) => `${selected} of ${total} ${total === 1 ? 'row' : 'rows'} selected.`,
	sort: (column, next) => `Sort ${column} ${next}`,
	toolbar: table => `${table} controls`,
}

const align = (value: DataTableColumn<any>['align']) => value ?? 'left'

const cellContent = (
	cell: DataTableCellView<any>,
	row: DataTableRowView<any, DataTableKey>,
) => {
	const render = cell.column.column.cell
	if (render) return render(row.original, {
		columnId: cell.column.id,
		sourceIndex: row.sourceIndex,
		value: cell.value,
	})
	return cell.value == null ? '' : String(cell.value)
}

const activeElement = (host: HTMLElement): HTMLElement | null => {
	const active = host.ownerDocument.activeElement
	return active instanceof HTMLElement && host.contains(active) ? active : null
}

const coordinate = (host: HTMLElement): FocusTarget | undefined => {
	let node = activeElement(host)
	let column: string | undefined
	while (node && node !== host) {
		column ??= node.dataset.columnId
		if (node.dataset.rowId) return { column, row: node.dataset.rowId }
		node = node.parentElement
	}
}

const findCoordinate = (host: HTMLElement, target: FocusTarget) => {
	for (const row of host.querySelectorAll<HTMLElement>('[data-row-id]')) {
		if (row.dataset.rowId !== target.row) continue
		if (!target.column) return row
		for (const cell of row.querySelectorAll<HTMLElement>('[data-column-id]')) {
			if (cell.dataset.columnId === target.column) {
				return cell.querySelector<HTMLElement>('button,input,[tabindex]:not([tabindex="-1"])') ?? cell
			}
		}
	}
}

const DataTableRoot: Stateful<DataTableRootArgs<any, DataTableKey>> = function* () {
	const model = createDataTableModel<any, DataTableKey>(this)
	let table: HTMLTableElement | null = null
	let searchElement: HTMLInputElement | null = null
	let composing = false
	let announceAfterRender: 'deferred' | 'immediate' | undefined
	const live = announce(this)
	const results = timer(this)
	const searchRef = (element: HTMLInputElement | null) => {
		if (!element) composing = false
		searchElement = element
	}

	listen(this, 'compositionstart', event => {
		if (event.target !== searchElement) return
		composing = true
		announceAfterRender = undefined
		results.stop()
	})

	listen(this, 'compositionend', event => {
		if (event.target !== searchElement || !searchElement) return
		composing = false
		announceAfterRender = 'deferred'
		model.setQuery(searchElement.value)
	})

	const preserveFocus = () => {
		const active = dom(this) ? activeElement(this) : null
		const target = active ? coordinate(this) : undefined
		if (!active) return
		queueMicrotask(() => {
			if (!dom(this) || this.signal.aborted) return
			const current = this.ownerDocument.activeElement
			if (
				current
				&& current !== this.ownerDocument.body
				&& current !== this.ownerDocument.documentElement
				&& !current.matches(':disabled')
			) return
			const next = target ? findCoordinate(this, target) : undefined
			const fallback = next ?? table
			fallback?.focus({ preventScroll: true })
		})
	}

	for (const args of this) {
		preserveFocus()
		const view = model.sync(args)
		const labels = { ...defaultLabels, ...args.labels }
		const classNames = args.classNames ?? {}
		const visibleColumns = view.columns.filter(column => column.visible)
		const visibleCount = visibleColumns.length
		const selectAllLabel = () => view.selection.all
			? labels[view.page.enabled ? 'deselectPage' : 'deselectResults']
			: labels[view.page.enabled ? 'selectPage' : 'selectResults']

		if (announceAfterRender) {
			const message = labels.results(view.filteredCount)
			results.stop()
			if (announceAfterRender === 'immediate') live.polite(message)
			else results.start(200, () => live.polite(message))
			announceAfterRender = undefined
		}

		const selectLabel = (row: DataTableRowView<any, DataTableKey>) => {
			const rowLabel = args.selection!.getRowLabel(row.original, row.sourceIndex)
			return row.selected ? labels.deselectRow(rowLabel) : labels.selectRow(rowLabel)
		}

		yield (
			<>
				{args.search || view.columns.some(column => column.column.facet?.options.length) || view.visibility ? (
					<Toolbar
						aria-label={labels.toolbar(args.label)}
						data-slot="data-table-toolbar"
					>
						<div data-slot="data-table-toolbar-controls">
							{args.search ? (
								<input
									aria-label={labels.search}
									data-slot="data-table-search"
									placeholder={args.search.placeholder ?? labels.search}
									ref={searchRef}
									set:oninput={(event: InputEvent) => {
										if (composing || event.isComposing) return
										announceAfterRender = 'deferred'
										model.setQuery((event.currentTarget as HTMLInputElement).value)
									}}
									set:onkeydown={(event: KeyboardEvent) => {
										if (
											event.key !== 'Enter'
											|| composing
											|| event.isComposing
											|| event.keyCode === 229
										) return
										announceAfterRender = undefined
										results.stop()
										live.polite(labels.results(view.filteredCount))
									}}
									set:value={view.query}
									type="search"
								/>
							) : null}

							{view.columns.flatMap(column => {
								const facet = column.column.facet
								if (!facet?.options.length) return []
								return [(
									<Menu key={column.id} class={classNames.menu}>
										<MenuTrigger data-slot="data-table-facet">
											<span aria-hidden="true" data-slot="data-table-facet-icon" />
											{facet.label}
											{column.active.length ? (
												<span data-slot="data-table-facet-count">{column.active.length}</span>
											) : null}
										</MenuTrigger>
										<MenuContent class={classNames.menu_content} data-slot="data-table-facet-content">
											<MenuLabel class={classNames.menu_label}>{facet.label}</MenuLabel>
											<MenuSeparator class={classNames.menu_separator} />
											{facet.options.map(option => (
												<MenuCheckboxItem
													key={option.value}
													checked={column.active.includes(option.value)}
													class={classNames.menu_item}
													indicatorClass={classNames.menu_indicator}
													indicatorIconClass={classNames.menu_indicator_icon}
													onCheckedChange={checked => {
														announceAfterRender = 'immediate'
														model.setFacet(column.id, option.value, checked)
													}}
													textValue={option.label}
												>
													{option.icon ? <span aria-hidden="true" data-slot="data-table-facet-option-icon">{option.icon}</span> : null}
													{option.label}
												</MenuCheckboxItem>
											))}
										</MenuContent>
									</Menu>
								)]
							})}

							{view.hasFilters ? (
								<button
									data-slot="data-table-reset"
									set:onclick={() => {
										announceAfterRender = 'immediate'
										model.reset()
									}}
									type="button"
								>
									{labels.reset}
									<span aria-hidden="true" data-slot="data-table-reset-icon" />
								</button>
							) : null}
						</div>

						{view.visibility ? (
							<Menu class={classNames.menu} placement="bottom-end">
								<MenuTrigger data-slot="data-table-columns">
									{labels.columns}
									<span aria-hidden="true" data-slot="data-table-columns-icon" />
								</MenuTrigger>
								<MenuContent class={classNames.menu_content} data-slot="data-table-columns-content">
									<MenuLabel class={classNames.menu_label}>{labels.columns}</MenuLabel>
									<MenuSeparator class={classNames.menu_separator} />
									{view.columns.filter(column => column.column.hideable !== false).map(column => (
										<MenuCheckboxItem
											key={column.id}
											checked={column.visible}
											class={classNames.menu_item}
											disabled={column.visible && visibleCount === 1}
											indicatorClass={classNames.menu_indicator}
											indicatorIconClass={classNames.menu_indicator_icon}
											onCheckedChange={checked => model.toggleColumn(column.id, checked)}
											textValue={column.column.label}
										>
											{column.column.label}
										</MenuCheckboxItem>
									))}
								</MenuContent>
							</Menu>
						) : null}
					</Toolbar>
				) : null}

				<div data-slot="data-table-container">
					<table
						aria-label={args.label}
						data-slot="table"
						ref={element => table = element}
						tabindex={-1}
					>
						<thead data-slot="table-header">
							<tr data-slot="table-row">
								{view.selection.enabled ? (
									<th data-slot="table-head" scope="col">
										<Checkbox
											aria-label={selectAllLabel()}
											class={classNames.checkbox}
											disabled={!view.rows.length}
											checked={view.selection.all}
											indicatorClass={classNames.checkbox_indicator}
											inputClass={classNames.checkbox_input}
											set:indeterminate={view.selection.some}
											onCheckedChange={(checked, event) => model.togglePage(checked, event)}
										/>
									</th>
								) : null}
								{visibleColumns.map(column => {
									const next = column.sorted === false ? 'ascending' : column.sorted === 'asc' ? 'descending' : 'none'
									const sortable = column.column.value !== undefined && column.column.sort !== false
									return (
										<th
											key={column.id}
											aria-sort={column.sorted === 'asc' ? 'ascending' : column.sorted === 'desc' ? 'descending' : undefined}
											data-align={align(column.column.align)}
											data-column-id={column.id}
											data-slot="table-head"
											scope="col"
										>
											{sortable ? (
												<button
													aria-label={labels.sort(column.column.label, next)}
													data-slot="data-table-sort-trigger"
													set:onclick={() => model.sort(column.id)}
													type="button"
												>
													<span>{column.column.header ?? column.column.label}</span>
													<span aria-hidden="true" data-slot="data-table-sort-icon" data-sort={column.sorted || 'none'} />
												</button>
											) : column.column.header ?? column.column.label}
										</th>
									)
								})}
							</tr>
						</thead>
						<tbody data-slot="table-body">
							{view.rows.length ? view.rows.map(row => (
								<tr
									key={row.id}
									data-row-id={row.id}
									data-slot="table-row"
									data-state={row.selected ? 'selected' : undefined}
								>
									{view.selection.enabled ? (
										<td data-column-id="\0selection" data-slot="table-cell">
											<Checkbox
												aria-label={selectLabel(row)}
												checked={row.selected}
												class={classNames.checkbox}
												indicatorClass={classNames.checkbox_indicator}
												inputClass={classNames.checkbox_input}
												onCheckedChange={(checked, event) => model.toggleRow(row.id, checked, event)}
											/>
										</td>
									) : null}
									{row.cells.map(cell => (
										<td
											key={cell.column.id}
											data-align={align(cell.column.column.align)}
											data-column-id={cell.column.id}
											data-slot="table-cell"
										>
											{cellContent(cell, row)}
										</td>
									))}
								</tr>
							)) : (
								<tr data-slot="table-row">
									<td
										colspan={visibleCount + (view.selection.enabled ? 1 : 0)}
										data-slot="data-table-empty"
									>
										{args.empty ?? 'No results.'}
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				{view.selection.enabled || view.page.enabled ? (
					<div data-slot="data-table-footer">
						{view.selection.enabled ? (
							<div aria-live="polite" data-slot="data-table-selection-summary" role="status">
								{labels.selected(view.selectedCount, view.sourceCount)}
							</div>
						) : null}
						{view.page.enabled ? (
							<nav aria-label={labels.pagination(args.label)} data-slot="data-table-pagination">
								<div data-slot="data-table-page-size">
									<span>{labels.rowsPerPage}</span>
									<select
										aria-label={labels.rowsPerPage}
										class={classNames.page_size}
										data-slot="data-table-page-size-select"
										set:onchange={(event: Event) => model.setPageSize(Number((event.currentTarget as HTMLSelectElement).value))}
										set:value={String(view.page.size)}
									>
										{view.page.sizes.map(size => (
											<option key={size} selected={size === view.page.size} value={String(size)}>{size}</option>
										))}
									</select>
								</div>
								<div data-slot="data-table-page-indicator">
									{labels.page(view.page.index + 1, view.page.count)}
								</div>
								<div data-slot="data-table-pagination-actions">
									<button
										aria-label={labels.firstPage}
										data-action="first"
										data-slot="data-table-pagination-action"
										disabled={view.page.index === 0}
										set:onclick={() => model.firstPage()}
										type="button"
									><span aria-hidden="true" /></button>
									<button
										aria-label={labels.previousPage}
										data-action="previous"
										data-slot="data-table-pagination-action"
										disabled={view.page.index === 0}
										set:onclick={() => model.previousPage()}
										type="button"
									><span aria-hidden="true" /></button>
									<button
										aria-label={labels.nextPage}
										data-action="next"
										data-slot="data-table-pagination-action"
										disabled={view.page.index >= view.page.count - 1}
										set:onclick={() => model.nextPage()}
										type="button"
									><span aria-hidden="true" /></button>
									<button
										aria-label={labels.lastPage}
										data-action="last"
										data-slot="data-table-pagination-action"
										disabled={view.page.index >= view.page.count - 1}
										set:onclick={() => model.lastPage()}
										type="button"
									><span aria-hidden="true" /></button>
								</div>
							</nav>
						) : null}
					</div>
				) : null}
			</>
		)
	}
}

/** Native, Ajo-owned client DataTable powered by its private indexed model. */
const DataTable = <T extends DataTableData, Key extends DataTableKey = DataTableKey>(args: DataTableArgs<T, Key>) => (
	<DataTableRoot
		{...rootAttrs(args as DataTableArgs<T, DataTableKey>, ['classNames', 'columns', 'empty', 'getRowKey', 'label', 'labels', 'pagination', 'rows', 'search', 'selection'])}
		attr:data-slot="data-table"
	/>
)

export { DataTable }
