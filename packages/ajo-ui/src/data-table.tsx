import type { IntrinsicElements, Stateful } from 'ajo'
import { announce, dom, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { Checkbox } from './checkbox'
import type { DataTableArgs, DataTableColumn, DataTableData, DataTableKey, DataTableLabels } from './data-table-contract'
import {
	createDataTableModel,
	dataTableDefaultLabels,
	type DataTableRowView,
	type DataTableView,
} from './data-table-model'
import {
	Menu,
	MenuCheckboxItem,
	MenuContent,
	MenuLabel,
	MenuSeparator,
	MenuTrigger,
} from './menu'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectList,
	SelectTrigger,
	SelectValue,
} from './select'
import { Toolbar } from './toolbar'
import { syncCheckedState } from './utils'

export type { DataTableArgs, DataTableColumn } from './data-table-contract'

type DataTableRootArgs<T extends DataTableData, Key extends DataTableKey> = Pick<
	DataTableArgs<T, Key>,
	'columns' | 'empty' | 'getRowKey' | 'label' | 'labels' | 'pagination' | 'rows' | 'search' | 'selection'
>

type FocusTarget = { column?: string; row: string }

const validLabel = (value: unknown, name: string) => {
	if (typeof value !== 'string' || !value.trim()) throw new TypeError(`DataTable invalid ${name}`)
	return value
}

const align = (value: DataTableColumn<any>['align']) => value ?? 'left'

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

const restoreCheckbox = (event: Event, checked: boolean, indeterminate = false) => {
	const input = event.currentTarget as HTMLInputElement
	input.checked = checked
	input.indeterminate = indeterminate
	syncCheckedState(input, input.closest<HTMLElement>('[data-slot="checkbox"]'))
}

const DataTableRoot: Stateful<DataTableRootArgs<any, DataTableKey>> = function* () {
	let model: ReturnType<typeof createDataTableModel<any, DataTableKey>> | undefined
	let table: HTMLTableElement | null = null
	let resultsTimer: ReturnType<typeof setTimeout> | undefined
	let composing = false
	let announceAfterRender: 'deferred' | 'immediate' | undefined
	const live = announce(this)

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

	this.signal.addEventListener('abort', () => {
		if (resultsTimer !== undefined) clearTimeout(resultsTimer)
		table = null
		model = undefined
	}, { once: true })

	for (const args of this) {
		preserveFocus()
		model ??= createDataTableModel(this, args)
		const view = model.sync(args) as DataTableView<any, DataTableKey>
		const labels = { ...dataTableDefaultLabels, ...args.labels }
		const text = <Name extends keyof DataTableLabels>(name: Name) => validLabel(labels[name], `label ${name}`)
		const call = <Name extends keyof DataTableLabels>(
			name: Name,
			...values: DataTableLabels[Name] extends (...args: infer Params) => string ? Params : never
		) => validLabel(((labels[name] as unknown) as (...args: typeof values) => string)(...values), `label ${name}`)
		const visibleColumns = view.columns.filter(column => column.visible)
		const visibleCount = visibleColumns.length
		const controlledSelection = args.selection?.value !== undefined
		const selectAllLabel = () => view.selection.all
			? text(view.page.enabled ? 'deselectPage' : 'deselectResults')
			: text(view.page.enabled ? 'selectPage' : 'selectResults')

		if (announceAfterRender) {
			const message = call('results', view.filteredCount)
			if (resultsTimer !== undefined) clearTimeout(resultsTimer)
			if (announceAfterRender === 'immediate') live.polite(message)
			else resultsTimer = setTimeout(() => live.polite(message), 200)
			announceAfterRender = undefined
		}

		const announceResults = (mode: 'deferred' | 'immediate') => {
			announceAfterRender = mode
		}

		const selectLabel = (row: DataTableRowView<any, DataTableKey>) => {
			const selection = args.selection!
			const rowLabel = validLabel(selection.getRowLabel(row.original, row.sourceIndex), 'row label')
			return row.selected ? call('deselectRow', rowLabel) : call('selectRow', rowLabel)
		}

		yield (
			<>
				{args.search || view.columns.some(column => column.column.facet?.options.length) || view.visibility ? (
					<Toolbar
						aria-label={call('toolbar', args.label)}
						data-slot="data-table-toolbar"
					>
						<div data-slot="data-table-toolbar-controls">
							{args.search ? (
								<input
									aria-label={text('search')}
									data-slot="data-table-search"
									placeholder={args.search.placeholder ?? text('search')}
									set:oncompositionend={(event: Event) => {
										composing = false
										announceResults('deferred')
										model!.setQuery((event.currentTarget as HTMLInputElement).value, event)
									}}
									set:oncompositionstart={() => { composing = true }}
									set:oninput={(event: Event) => {
										if (!composing) announceResults('deferred')
										model!.setQuery((event.currentTarget as HTMLInputElement).value, event)
									}}
									set:onkeydown={(event: KeyboardEvent) => {
										if (event.key !== 'Enter' || event.isComposing) return
										announceAfterRender = undefined
										if (resultsTimer !== undefined) clearTimeout(resultsTimer)
										resultsTimer = undefined
										live.polite(call('results', view.filteredCount))
									}}
									set:value={view.query}
									type="search"
								/>
							) : null}

							{view.columns.flatMap(column => {
								const facet = column.column.facet
								if (!facet?.options.length) return []
								return [(
									<Menu key={column.id}>
										<MenuTrigger data-slot="data-table-facet">
											<span aria-hidden="true" data-slot="data-table-facet-icon" />
											{facet.label}
											{column.active.length ? (
												<span data-slot="data-table-facet-count">{column.active.length}</span>
											) : null}
										</MenuTrigger>
										<MenuContent align="start" data-slot="data-table-facet-content">
											<MenuLabel>{facet.label}</MenuLabel>
											<MenuSeparator />
											{facet.options.map(option => (
												<MenuCheckboxItem
													key={option.value}
													checked={column.active.includes(option.value)}
													onCheckedChange={(checked, event) => {
														announceResults('immediate')
														model!.setFacet(column.id, option.value, checked, event)
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
									set:onclick={(event: Event) => {
										announceResults('immediate')
										model!.reset(event)
									}}
									type="button"
								>
									{text('reset')}
									<span aria-hidden="true" data-slot="data-table-reset-icon" />
								</button>
							) : null}
						</div>

						{view.visibility ? (
							<Menu>
								<MenuTrigger data-slot="data-table-columns">
									{text('columns')}
									<span aria-hidden="true" data-slot="data-table-columns-icon" />
								</MenuTrigger>
								<MenuContent align="end" data-slot="data-table-columns-content">
									<MenuLabel>{text('columns')}</MenuLabel>
									<MenuSeparator />
									{view.columns.filter(column => column.column.hideable !== false).map(column => (
										<MenuCheckboxItem
											key={column.id}
											checked={column.visible}
											disabled={column.visible && visibleCount === 1}
											onCheckedChange={checked => model!.toggleColumn(column.id, checked)}
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
											disabled={!view.rows.length}
											set:checked={view.selection.all}
											set:indeterminate={view.selection.some}
											onCheckedChange={(checked, event) => {
												try { model!.togglePage(checked, event) } finally {
													if (controlledSelection && model) {
														const selection = model.selection()
														restoreCheckbox(event, selection.all, selection.some)
													}
												}
											}}
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
													aria-label={call('sort', column.column.label, next)}
													data-slot="data-table-sort-trigger"
													set:onclick={(event: Event) => model!.sort(column.id, event)}
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
												set:checked={row.selected}
												onCheckedChange={(checked, event) => {
													try { model!.toggleRow(row.id, checked, event) } finally {
														if (controlledSelection && model) restoreCheckbox(event, model.selected(row.id))
													}
												}}
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
											{model!.cell(cell, row)}
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
								{call('selected', view.selectedCount, view.sourceCount)}
							</div>
						) : null}
						{view.page.enabled ? (
							<nav aria-label={call('pagination', args.label)} data-slot="data-table-pagination">
								<div data-slot="data-table-page-size">
									<span>{text('rowsPerPage')}</span>
									<Select<number>
										value={view.page.size}
										onValueChange={value => { if (value !== null) model!.setPageSize(value) }}
									>
										<SelectTrigger aria-label={text('rowsPerPage')}>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectList>
												{view.page.sizes.map(size => <SelectItem key={size} value={size}>{size}</SelectItem>)}
											</SelectList>
										</SelectContent>
									</Select>
								</div>
								<div data-slot="data-table-page-indicator">
									{call('page', view.page.index + 1, view.page.count)}
								</div>
								<div data-slot="data-table-pagination-actions">
									<button
										aria-label={text('firstPage')}
										data-action="first"
										data-slot="data-table-pagination-action"
										disabled={view.page.index === 0}
										set:onclick={() => model!.firstPage()}
										type="button"
									><span aria-hidden="true" /></button>
									<button
										aria-label={text('previousPage')}
										data-action="previous"
										data-slot="data-table-pagination-action"
										disabled={view.page.index === 0}
										set:onclick={() => model!.previousPage()}
										type="button"
									><span aria-hidden="true" /></button>
									<button
										aria-label={text('nextPage')}
										data-action="next"
										data-slot="data-table-pagination-action"
										disabled={view.page.index >= view.page.count - 1}
										set:onclick={() => model!.nextPage()}
										type="button"
									><span aria-hidden="true" /></button>
									<button
										aria-label={text('lastPage')}
										data-action="last"
										data-slot="data-table-pagination-action"
										disabled={view.page.index >= view.page.count - 1}
										set:onclick={() => model!.lastPage()}
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

const safeRootAttrs = (attrs: Record<string, unknown>) => {
	const result = { ...rootAttrs(attrs) }
	for (const name of [
		'aria-label',
		'aria-labelledby',
		'attr:aria-label',
		'attr:aria-labelledby',
		'set:ariaLabel',
		'set:ariaLabelledByElements',
	]) delete result[name]
	return result
}

/** Native, Ajo-owned client DataTable powered by a private TanStack Table v9 model. */
const DataTable = <T extends DataTableData, Key extends DataTableKey = DataTableKey>({
	children: _children,
	class: classes,
	columns,
	empty,
	getRowKey,
	label,
	labels,
	pagination,
	rows,
	search,
	selection,
	...attrs
}: DataTableArgs<T, Key>) => (
	<DataTableRoot
		{...safeRootAttrs(attrs as Record<string, unknown>) as IntrinsicElements['div']}
		columns={columns}
		empty={empty}
		getRowKey={getRowKey}
		label={label}
		labels={labels}
		pagination={pagination}
		rows={rows}
		search={search}
		selection={selection as DataTableRootArgs<any, DataTableKey>['selection']}
		attr:class={classes}
		attr:data-slot="data-table"
	/>
)

export { DataTable }
export default DataTable
