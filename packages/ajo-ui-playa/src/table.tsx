import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { overflow } from 'ajo-cloves'
import { part, type OmitArg } from 'ajo-ui/utils'

export type TableArgs = WithChildren<IntrinsicElements['table'] & { class?: string }>
export type TableHeaderArgs = WithChildren<IntrinsicElements['thead'] & { class?: string }>
export type TableBodyArgs = WithChildren<IntrinsicElements['tbody'] & { class?: string }>
export type TableFooterArgs = WithChildren<IntrinsicElements['tfoot'] & { class?: string }>
export type TableRowArgs = WithChildren<IntrinsicElements['tr'] & { class?: string }>
export type TableHeadArgs = WithChildren<IntrinsicElements['th'] & { class?: string }>
export type TableCellArgs = WithChildren<IntrinsicElements['td'] & { class?: string }>
export type TableCaptionArgs = WithChildren<IntrinsicElements['caption'] & { class?: string }>

// The runtime routes `ref` and `set:*` on a stateful component to its host,
// so the table's own `ref` travels as `tableRef`.
type TableRootArgs = OmitArg<TableArgs, 'ref'> & { tableRef?: TableArgs['ref'] }

// The wrapper scrolls a wide table and stamps the edges it overflows toward
// (data-overflow-x), so the theme fades the side there is more to see.
const TableRoot: Stateful<TableRootArgs> = function* () {
	const edges = overflow(this, { target: () => this })

	for (const { tableRef, ...attrs } of this) {
		edges.sync()
		yield <table {...attrs} data-slot="table" ref={tableRef} />
	}
}

/**
 * Responsive wrapper and native table element. The wrapper carries the shared
 * `playa-table` slot recipe, so every part below is styled through its
 * `data-slot` marker, the same rules the Playa DataTable consumes. A named
 * table makes the wrapper its scroll region: a keyboard stop that carries the
 * name, so it is announced once.
 */
const Table: Stateless<TableArgs> = ({ 'aria-label': label, 'aria-labelledby': labelledby, ref, ...attrs }) => {
	const named = !!(label || labelledby)

	return (
		<TableRoot
			{...attrs}
			tableRef={ref}
			attr:aria-label={label}
			attr:aria-labelledby={labelledby}
			attr:class="playa-table-container playa-table playa-focus [--focus-offset:calc(var(--focus-width)/-2)]"
			attr:data-slot="table-container"
			attr:role={named ? 'region' : undefined}
			attr:tabindex={named ? 0 : undefined}
		/>
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
