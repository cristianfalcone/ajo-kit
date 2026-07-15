import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'

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
 * `data-slot` marker — the same rules the Playa DataTable consumes.
 */
const Table: Stateless<TableArgs> = ({
	children,
	class: classes,
	...attrs
}) => (
	<div class="playa-table-container playa-table" data-slot="table-container">
		<table
			{...attrs}
			class={classes}
			data-slot="table"
		>
			{children}
		</table>
	</div>
)

/** Native table header group. */
const TableHeader: Stateless<TableHeaderArgs> = ({
	children,
	class: classes,
	...attrs
}) => (
	<thead
		{...attrs}
		class={classes}
		data-slot="table-header"
	>
		{children}
	</thead>
)

/** Native table body group. */
const TableBody: Stateless<TableBodyArgs> = ({
	children,
	class: classes,
	...attrs
}) => (
	<tbody
		{...attrs}
		class={classes}
		data-slot="table-body"
	>
		{children}
	</tbody>
)

/** Native table footer group. */
const TableFooter: Stateless<TableFooterArgs> = ({
	children,
	class: classes,
	...attrs
}) => (
	<tfoot
		{...attrs}
		class={classes}
		data-slot="table-footer"
	>
		{children}
	</tfoot>
)

/** Native table row. */
const TableRow: Stateless<TableRowArgs> = ({
	children,
	class: classes,
	...attrs
}) => (
	<tr
		{...attrs}
		class={classes}
		data-slot="table-row"
	>
		{children}
	</tr>
)

/** Native table header cell. */
const TableHead: Stateless<TableHeadArgs> = ({
	children,
	class: classes,
	scope = 'col',
	...attrs
}) => (
	<th
		{...attrs}
		class={classes}
		data-slot="table-head"
		scope={scope}
	>
		{children}
	</th>
)

/** Native table data cell. */
const TableCell: Stateless<TableCellArgs> = ({
	children,
	class: classes,
	...attrs
}) => (
	<td
		{...attrs}
		class={classes}
		data-slot="table-cell"
	>
		{children}
	</td>
)

/** Native table caption. Must be the first child of `Table`. */
const TableCaption: Stateless<TableCaptionArgs> = ({
	children,
	class: classes,
	...attrs
}) => (
	<caption
		{...attrs}
		class={classes}
		data-slot="table-caption"
	>
		{children}
	</caption>
)

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
