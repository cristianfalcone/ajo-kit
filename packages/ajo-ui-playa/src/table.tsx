import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import { part } from 'ajo-ui/utils'

export type TableArgs = WithChildren<IntrinsicElements['table'] & { class?: string }>
export type TableHeaderArgs = WithChildren<IntrinsicElements['thead'] & { class?: string }>
export type TableBodyArgs = WithChildren<IntrinsicElements['tbody'] & { class?: string }>
export type TableFooterArgs = WithChildren<IntrinsicElements['tfoot'] & { class?: string }>
export type TableRowArgs = WithChildren<IntrinsicElements['tr'] & { class?: string }>
export type TableHeadArgs = WithChildren<IntrinsicElements['th'] & { class?: string }>
export type TableCellArgs = WithChildren<IntrinsicElements['td'] & { class?: string }>
export type TableCaptionArgs = WithChildren<IntrinsicElements['caption'] & { class?: string }>

/**
 * Responsive wrapper and native table element. The wrapper carries the shared
 * `playa-table` slot recipe, so every part below is styled through its
 * `data-slot` marker, the same rules the Playa DataTable consumes. A named
 * table makes the wrapper its scroll region: a keyboard stop that carries the
 * name, so it is announced once.
 */
const Table: Stateless<TableArgs> = ({ 'aria-label': label, 'aria-labelledby': labelledby, ...attrs }) => {
	const named = !!(label || labelledby)

	return (
		<div
			aria-label={label}
			aria-labelledby={labelledby}
			class="playa-table-container playa-table playa-focus [--focus-offset:calc(var(--focus-width)/-2)]"
			data-slot="table-container"
			role={named ? 'region' : undefined}
			tabindex={named ? 0 : undefined}
		>
			<table {...attrs} data-slot="table" />
		</div>
	)
}

/** Native table header group. */
const TableHeader = part<TableHeaderArgs>('thead', 'table-header')

/** Native table body group. */
const TableBody = part<TableBodyArgs>('tbody', 'table-body')

/** Native table footer group. */
const TableFooter = part<TableFooterArgs>('tfoot', 'table-footer')

/** Native table row. */
const TableRow = part<TableRowArgs>('tr', 'table-row')

/** Native table header cell; scopes its column unless told otherwise. */
const TableHead: Stateless<TableHeadArgs> = ({ scope = 'col', ...attrs }) => (
	<th {...attrs} data-slot="table-head" scope={scope} />
)

/** Native table data cell. */
const TableCell = part<TableCellArgs>('td', 'table-cell')

/** Native table caption. Must be the first child of `Table`. */
const TableCaption = part<TableCaptionArgs>('caption', 'table-caption')

export {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
}
