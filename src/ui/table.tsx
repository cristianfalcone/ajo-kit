import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'

export type TableArgs = WithChildren<IntrinsicElements['table'] & { class?: string }>
export type TableHeaderArgs = WithChildren<IntrinsicElements['thead'] & { class?: string }>
export type TableBodyArgs = WithChildren<IntrinsicElements['tbody'] & { class?: string }>
export type TableFooterArgs = WithChildren<IntrinsicElements['tfoot'] & { class?: string }>
export type TableRowArgs = WithChildren<IntrinsicElements['tr'] & { class?: string }>
export type TableHeadArgs = WithChildren<IntrinsicElements['th'] & { class?: string }>
export type TableCellArgs = WithChildren<IntrinsicElements['td'] & { class?: string }>
export type TableCaptionArgs = WithChildren<IntrinsicElements['caption'] & { class?: string }>

/** Responsive wrapper and native table element. */
const Table: Stateless<TableArgs> = ({
	children,
	class: classes,
	...attrs
}) => (
	<div class="relative w-full overflow-x-auto" data-slot="table-container">
		<table
			{...attrs}
			class={clsx('w-full caption-bottom text-sm', classes)}
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
		class={clsx('[&_tr]:border-b', classes)}
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
		class={clsx('[&_tr:last-child]:border-0', classes)}
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
		class={clsx('border-t bg-muted/50 font-medium [&>tr]:last:border-b-0', classes)}
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
		class={clsx('border-b transition-colors hover:bg-accent has-aria-expanded:bg-accent data-[state=selected]:bg-muted', classes)}
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
		class={clsx('h-11 px-4 text-left align-middle text-xs font-medium uppercase tracking-wider whitespace-nowrap text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]', classes)}
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
		class={clsx('px-4 py-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]', classes)}
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
		class={clsx('mt-4 text-sm text-muted-foreground', classes)}
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
