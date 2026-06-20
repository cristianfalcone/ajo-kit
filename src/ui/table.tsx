import type { Children, IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'

type Align = 'left' | 'right'
type Tone = 'body' | 'code' | 'default' | 'muted'

type CellClass<T> = string | ((row: T, index: number) => string | undefined)

export type Column<T> = {
	align?: Align
	cell: (row: T, index: number) => Children
	class?: CellClass<T>
	header: string
	headerClass?: string
	key?: string
	tone?: Tone
}

type TableProps<T = unknown> = WithChildren<IntrinsicElements['table'] & {
	columns?: Column<T>[]
	getKey?: (row: T, index: number) => number | string
	rows?: T[]
	class?: string
}>
type HeadProps = WithChildren<IntrinsicElements['thead'] & { class?: string }>
type BodyProps = WithChildren<IntrinsicElements['tbody'] & { class?: string }>
type RowProps = WithChildren<IntrinsicElements['tr'] & { class?: string }>
type HeaderProps = WithChildren<IntrinsicElements['th'] & {
	align?: Align
	class?: string
}>
type CellProps = WithChildren<IntrinsicElements['td'] & {
	align?: Align
	tone?: Tone
	class?: string
}>

const align = {
	left: 'text-left',
	right: 'text-right',
}

const tone = {
	default: '',
	body: 'text-slate-600 dark:text-slate-300',
	muted: 'text-slate-500 dark:text-slate-400',
	code: 'text-slate-500 dark:text-slate-400 font-mono text-xs',
}

const resolve = <T,>(classes: CellClass<T> | undefined, row: T, index: number) =>
	typeof classes === 'function' ? classes(row, index) : classes

/** Shared table element with ajo-kit sizing. */
export const Table = <T,>({
	class: classes,
	children,
	columns,
	getKey,
	rows,
	...props
}: TableProps<T>) => (
	<table {...props} class={clsx('w-full text-sm', classes)}>
		{columns && rows ? (
			<>
				<Thead>
					<tr>
						{columns.map(column => (
							<Th key={column.key ?? column.header} align={column.align} class={column.headerClass}>
								{column.header}
							</Th>
						))}
					</tr>
				</Thead>
				<Tbody>
					{rows.map((row, index) => (
						<Tr key={getKey ? getKey(row, index) : index}>
							{columns.map(column => (
								<Td
									key={column.key ?? column.header}
									align={column.align}
									tone={column.tone}
									class={resolve(column.class, row, index)}
								>
									{column.cell(row, index)}
								</Td>
							))}
						</Tr>
					))}
				</Tbody>
			</>
		) : children}
	</table>
)

/** Shared table header band. */
export const Thead: Stateless<HeadProps> = ({ class: classes, children, ...props }) => (
	<thead {...props} class={clsx('bg-primary/10 dark:bg-slate-700/50', classes)}>
		{children}
	</thead>
)

/** Shared table body with row dividers. */
export const Tbody: Stateless<BodyProps> = ({ class: classes, children, ...props }) => (
	<tbody {...props} class={clsx('divide-y divide-slate-200 dark:divide-slate-700', classes)}>
		{children}
	</tbody>
)

/** Shared data row with hover treatment. */
export const Tr: Stateless<RowProps> = ({ class: classes, children, ...props }) => (
	<tr {...props} class={clsx('bg-slate-50 hover:bg-slate-100 dark:bg-transparent dark:hover:bg-white/10', classes)}>
		{children}
	</tr>
)

/** Shared table header cell. */
export const Th: Stateless<HeaderProps> = ({
	align: text = 'left',
	class: classes,
	children,
	...props
}) => (
	<th
		{...props}
		class={clsx('px-4 py-3', align[text], 'text-sm font-medium text-slate-600 dark:text-slate-200', classes)}
	>
		{children}
	</th>
)

/** Shared table data cell. */
export const Td: Stateless<CellProps> = ({
	align: text = 'left',
	tone: color = 'default',
	class: classes,
	children,
	...props
}) => (
	<td {...props} class={clsx('px-4 py-3', align[text], tone[color], classes)}>
		{children}
	</td>
)

export default Table
