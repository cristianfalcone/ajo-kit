import type { OmitArg } from 'ajo-ui/utils'
import clsx from 'clsx'
import type { FixedArgs } from 'ajo-ui/utils'
import {
	DataTable as BaseDataTable,
	type DataTableClasses as BaseDataTableClasses,
	type DataTableRenderers as BaseDataTableRenderers,
	type DataTableArgs as BaseDataTableArgs,
	type DataTableCellContext,
	type DataTableColumn,
	type DataTableFacet,
	type DataTableFacetOption,
	type DataTableRow,
	type DataTableSearch,
	type DataTableSortDirection,
} from 'ajo-ui/data-table'
import Button from './button'
import Checkbox from './checkbox'
import {
	Menu,
	MenuCheckboxItem,
	MenuContent,
	MenuLabel,
	MenuSeparator,
	MenuTrigger,
} from './menu'
import Input from './input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectList,
	SelectTrigger,
	SelectValue,
} from './select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from './table'

export type {
	DataTableCellContext,
	DataTableColumn,
	DataTableFacet,
	DataTableFacetOption,
	DataTableRow,
	DataTableSearch,
	DataTableSortDirection,
}

export type DataTableArgs<T = any> = OmitArg<BaseDataTableArgs<T>, 'classes' | 'renderers'> & FixedArgs<'classes' | 'renderers'>

const align = {
	center: 'text-center',
	left: 'text-left',
	right: 'text-right',
}

const classes: BaseDataTableClasses<any> = {
	align,
	columnItem: 'capitalize',
	columnsIcon: 'i-lucide-chevron-down size-4',
	columnsTrigger: 'inline-flex h-8 items-center gap-2 rounded-md edge bg-transparent px-3 text-sm font-medium transition-all outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
	emptyCell: 'h-24 text-center text-muted-foreground',
	facetCount: 'rounded-xs bg-muted px-1.5 py-0.5 text-xs tabular-nums',
	facetIcon: 'i-lucide-list-filter size-4',
	facetOptionIcon: 'size-4',
	facetTrigger: 'inline-flex h-8 items-center gap-2 rounded-md border border-dashed bg-transparent px-3 text-sm font-medium transition-all outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
	firstPageButton: 'hidden size-8 lg:inline-flex',
	firstPageIcon: 'i-lucide-chevrons-left size-4',
	lastPageButton: 'hidden size-8 lg:inline-flex',
	lastPageIcon: 'i-lucide-chevrons-right size-4',
	nextPageButton: 'size-8',
	nextPageIcon: 'i-lucide-chevron-right size-4',
	pageButtons: 'flex items-center gap-2',
	pageLabel: 'w-[100px] text-center text-sm font-medium tabular-nums',
	pageSizeGroup: 'flex items-center gap-2',
	pageSizeLabel: 'text-sm font-medium',
	pageSizeTrigger: 'h-8 w-[74px]',
	pagination: 'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between',
	paginationControls: 'flex flex-wrap items-center gap-4 sm:justify-end',
	previousPageButton: 'size-8',
	previousPageIcon: 'i-lucide-chevron-left size-4',
	resetIcon: 'i-lucide-x size-4',
	rowSelectCell: 'w-12',
	searchInput: 'h-8 w-[180px] lg:w-[260px]',
	selectHead: 'w-12',
	selection: 'text-sm text-muted-foreground tabular-nums',
	sortButton: column => clsx('-ml-3', column.align === 'right' && 'ml-auto -mr-3'),
	sortIcon: direction => clsx(
		direction === 'asc' && 'i-lucide-arrow-up',
		direction === 'desc' && 'i-lucide-arrow-down',
		!direction && 'i-lucide-arrow-up-down',
		'size-4',
	),
	tableContainer: 'overflow-hidden rounded-lg edge',
	toolbar: 'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between',
	toolbarControls: 'flex flex-1 flex-wrap items-center gap-2',
}

const renderers: BaseDataTableRenderers<any> = {
	body: ({ children, key }) => <TableBody key={key}>{children}</TableBody>,
	cell: ({ children, class: classes, colspan, key }) => <TableCell key={key} class={classes} colspan={colspan}>{children}</TableCell>,
	checkbox: ({ ariaLabel, checked, indeterminate, onChange }) => (
		<Checkbox
			aria-label={ariaLabel}
			set:checked={checked}
			set:indeterminate={indeterminate}
			set:onchange={(event: Event) => onChange((event.target as HTMLInputElement).checked, event)}
		/>
	),
	columnVisibility: ({ columns, hidden, iconClass, itemClass, label, setHidden, triggerClass }) => (
		<Menu>
			<MenuTrigger class={triggerClass}>
				{label}
				<span aria-hidden="true" class={iconClass} />
			</MenuTrigger>
			<MenuContent align="end">
				<MenuLabel>Toggle columns</MenuLabel>
				<MenuSeparator />
				{columns.filter(({ column }) => column.hideable !== false).map(({ column, id }) => (
					<MenuCheckboxItem
						key={id}
						checked={!hidden.has(id)}
						class={itemClass}
						onCheckedChange={(checked: boolean) => setHidden(id, checked)}
					>
						{column.header}
					</MenuCheckboxItem>
				))}
			</MenuContent>
		</Menu>
	),
	facet: ({ active, countClass, facet, iconClass, optionIconClass, setFacet, triggerClass }) => (
		<Menu key={facet.id}>
			<MenuTrigger class={triggerClass}>
				<span aria-hidden="true" class={iconClass} />
				{facet.title}
				{active.size ? <span class={countClass}>{active.size}</span> : null}
			</MenuTrigger>
			<MenuContent align="start">
				<MenuLabel>{facet.title}</MenuLabel>
				<MenuSeparator />
				{facet.options.map(option => (
					<MenuCheckboxItem
						key={option.value}
						checked={active.has(option.value)}
						onCheckedChange={(checked: boolean) => setFacet(facet.id, option.value, checked)}
					>
						{option.icon ? <span aria-hidden="true" class={clsx(option.icon, optionIconClass)} /> : null}
						{option.label}
					</MenuCheckboxItem>
				))}
			</MenuContent>
		</Menu>
	),
	head: ({ 'aria-sort': ariaSort, children, class: classes, key }) => (
		<TableHead key={key} aria-sort={ariaSort} class={classes}>
			{children}
		</TableHead>
	),
	header: ({ children, key }) => <TableHeader key={key}>{children}</TableHeader>,
	pageButton: ({ ariaLabel, class: classes, disabled, iconClass, onClick }) => (
		<Button
			aria-label={ariaLabel}
			class={classes}
			disabled={disabled}
			size="icon"
			variant="outline"
			set:onclick={onClick}
		>
			<span aria-hidden="true" class={iconClass} />
		</Button>
	),
	pageSize: ({ onChange, options, triggerClass, value }) => (
		<Select value={value} onValueChange={next => onChange(Number(next ?? 0))}>
			<SelectTrigger class={triggerClass}>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectList>
					{options.map(option => (
						<SelectItem key={option} value={String(option)}>{option}</SelectItem>
					))}
				</SelectList>
			</SelectContent>
		</Select>
	),
	reset: ({ iconClass, label, onReset }) => (
		<Button size="sm" variant="ghost" set:onclick={onReset}>
			{label}
			<span aria-hidden="true" class={iconClass} />
		</Button>
	),
	row: ({ 'data-state': state, children, key }) => <TableRow key={key} data-state={state}>{children}</TableRow>,
	search: ({ ariaLabel, class: classes, placeholder, query, setQuery }) => (
		<Input
			aria-label={ariaLabel}
			class={classes}
			placeholder={placeholder}
			set:oninput={(event: Event) => setQuery((event.target as HTMLInputElement).value)}
			set:value={query}
			type="search"
		/>
	),
	sort: ({ children, class: classes, iconClass, onClick }) => (
		<Button
			class={classes}
			size="sm"
			variant="ghost"
			set:onclick={onClick}
		>
			<span>{children}</span>
			<span aria-hidden="true" class={iconClass} />
		</Button>
	),
	table: ({ children, key }) => <Table key={key}>{children}</Table>,
}

/** Ajo-native sortable, filterable, paginated data table built from UI primitives. */
const DataTable = <T = any,>({
	class: className,
	classes: _classes,
	children: _children,
	renderers: _renderers,
	...attrs
}: DataTableArgs<T>) => (
	<BaseDataTable
		{...attrs}
		class={clsx('flex w-full flex-col gap-4', className)}
		classes={classes}
		renderers={renderers}
	/>
)

export { DataTable }
