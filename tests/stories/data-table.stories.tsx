/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import { DataTable, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '/src/ui'
import type { DataTableColumn, DataTableFacet } from '/src/ui'

type Payment = {
	id: string
	amount: number
	status: 'failed' | 'pending' | 'processing' | 'success'
	email: string
}

const payments: Payment[] = [
	{ id: 'm5gr84i9', amount: 316, status: 'success', email: 'ken99@example.com' },
	{ id: '3u1reuv4', amount: 242, status: 'success', email: 'abe45@example.com' },
	{ id: 'derv1ws0', amount: 837, status: 'processing', email: 'monserrat44@example.com' },
	{ id: '5kma53ae', amount: 874, status: 'success', email: 'silas22@example.com' },
	{ id: 'bhqecj4p', amount: 721, status: 'failed', email: 'carmella@example.com' },
	{ id: 'x1n9p0ab', amount: 125, status: 'pending', email: 'm@example.com' },
]

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

const columns: DataTableColumn<Payment>[] = [
	{
		accessorKey: 'status',
		header: 'Status',
		cell: payment => <span class="capitalize">{payment.status}</span>,
	},
	{
		accessorKey: 'email',
		header: 'Email',
		cell: payment => <span class="lowercase">{payment.email}</span>,
	},
	{
		accessorKey: 'amount',
		header: 'Amount',
		align: 'right',
		cell: payment => <span class="font-medium">{money.format(payment.amount)}</span>,
	},
	{
		id: 'actions',
		header: '',
		hideable: false,
		sort: false,
		align: 'right',
		cell: payment => (
			<DropdownMenu>
				<DropdownMenuTrigger class="inline-flex size-8 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground">
					<span class="sr-only">Open menu</span>
					<span aria-hidden="true" class="i-lucide-ellipsis size-4" />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuLabel>Actions</DropdownMenuLabel>
					<DropdownMenuItem>Copy payment ID</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem>View {payment.email}</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		),
	},
]

const facets: DataTableFacet<Payment>[] = [
	{
		id: 'status',
		title: 'Status',
		column: 'status',
		options: [
			{ label: 'Success', value: 'success', icon: 'i-lucide-check-circle' },
			{ label: 'Processing', value: 'processing', icon: 'i-lucide-loader-circle' },
			{ label: 'Pending', value: 'pending', icon: 'i-lucide-clock' },
			{ label: 'Failed', value: 'failed', icon: 'i-lucide-x-circle' },
		],
	},
]

export default {
	title: 'UI/Data Table',
	component: DataTable,
	args: {
		data: payments,
	},
	parameters: {
		docs: { description: 'Ajo-native data table pattern with search, sorting, filtering, column visibility, selection, and pagination.' },
	},
} satisfies Meta<typeof DataTable>

const rows = (canvas: HTMLElement) =>
	Array.from(canvas.querySelectorAll<HTMLTableRowElement>('[data-slot="table-body"] [data-slot="table-row"]'))

const dataRows = (canvas: HTMLElement) =>
	rows(canvas).filter(row => !row.textContent?.includes('No results.'))

const type = (input: HTMLInputElement, value: string) => {
	input.value = value
	input.dispatchEvent(new InputEvent('input', { bubbles: true, data: value }))
}

const announced = () =>
	document.body.querySelector<HTMLElement>('[aria-live="polite"][aria-atomic="true"]')?.textContent

export const Default: Story<typeof DataTable> = {
	args: {
		selectable: true,
		pageSize: 5,
		placeholder: 'Filter emails...',
	},
	argTypes: {
		pageSize: { control: 'select', options: [2, 5, 10] },
		placeholder: { control: 'text', label: 'Search placeholder' },
	},
	render: ({ placeholder, ...args }) => (
		<DataTable
			{...args}
			aria-label="Payments"
			columns={columns}
			data={payments}
			data-story-table="root"
			getRowId={(payment: Payment) => payment.id}
			id="payments-table"
			search={{ placeholder: String(placeholder), column: 'email' }}
			facets={facets}
			pageSizeOptions={[2, 5, 10]}
		/>
	),
	play: async ({ canvas }) => {
		const table = canvas.querySelector('[data-slot="data-table"]')
		if (!table) throw new Error('DataTable root was not rendered')
		if (
			table !== canvas.firstElementChild
			|| table.id !== 'payments-table'
			|| table.getAttribute('aria-label') !== 'Payments'
			|| table.getAttribute('data-story-table') !== 'root'
		) {
			throw new Error('DataTable did not forward root attrs onto its single public host')
		}
		if (dataRows(canvas).length !== 5) throw new Error('DataTable did not paginate to the first five rows')

		const search = canvas.querySelector<HTMLInputElement>('input[type="search"]')
		if (!search) throw new Error('DataTable search input was not rendered')
		type(search, 'carmella')
		await new Promise(resolve => setTimeout(resolve))
		if (dataRows(canvas).length !== 1 || !canvas.textContent?.includes('carmella@example.com')) {
			throw new Error('DataTable search did not filter rows')
		}
		if (announced() !== '1 result') throw new Error('DataTable did not announce its singular result label')

		const reset = Array.from(canvas.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent?.includes('Reset'))
		reset?.click()
		await new Promise(resolve => setTimeout(resolve))
		if (dataRows(canvas).length !== 5) throw new Error('DataTable reset did not restore paginated rows')
		if (announced() !== '6 results') throw new Error('DataTable did not announce its plural result label')

		const emailSort = Array.from(canvas.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent?.includes('Email'))
		if (!emailSort) throw new Error('DataTable sortable header was not rendered')
		emailSort.click()
		await new Promise(resolve => setTimeout(resolve))
		const firstEmail = canvas.querySelector('[data-slot="table-body"] [data-slot="table-row"] [data-slot="table-cell"]:nth-child(3)')
		if (!firstEmail?.textContent?.includes('abe45@example.com')) throw new Error('DataTable ascending sort did not reorder rows')
		if (!canvas.querySelector('[aria-sort="ascending"]')) throw new Error('DataTable sorted column did not expose aria-sort')

		const firstRowCheckbox = canvas.querySelector<HTMLInputElement>('[data-slot="table-body"] [data-slot="checkbox-input"]')
		if (!firstRowCheckbox) throw new Error('DataTable row checkbox was not rendered')
		firstRowCheckbox.click()
		await new Promise(resolve => setTimeout(resolve))
		if (!canvas.textContent?.includes('1 of 6 row(s) selected.')) throw new Error('DataTable selection count did not update')
	},
}

export const Empty: Story<typeof DataTable> = {
	args: {
		data: [],
		message: 'No payments found.',
	},
	argTypes: {
		message: { control: 'text', label: 'Empty message' },
	},
	render: ({ message, ...args }) => (
		<DataTable
			{...args}
			columns={columns}
			data={[]}
			search={false}
			columnVisibility={false}
			empty={(
				<div class="flex flex-col items-center gap-2">
					<span aria-hidden="true" class="i-lucide-inbox size-8 text-muted-foreground" />
					<span>{message}</span>
				</div>
			)}
		/>
	),
	play: async ({ canvas }) => {
		if (!canvas.textContent?.includes('No payments found.')) throw new Error('DataTable custom empty state was not rendered')
	},
}

export const HiddenColumns: Story<typeof DataTable> = {
	args: {
		pageSize: 10,
	},
	render: args => (
		<DataTable
			{...args}
			columns={[
				columns[0],
				columns[1],
				{ ...columns[2], hidden: true },
			]}
			data={payments}
			getRowId={(payment: Payment) => payment.id}
			search={false}
		/>
	),
	play: async ({ canvas }) => {
		const headers = Array.from(canvas.querySelectorAll('[data-slot="table-head"]'))
			.map(header => header.textContent?.trim())
		if (headers.includes('Amount')) throw new Error('DataTable did not honor initially hidden columns')
		const trigger = Array.from(canvas.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent?.includes('Columns'))
		if (!trigger) throw new Error('DataTable column visibility trigger was not rendered')
	},
}

export const ActionsOnly: Story<typeof DataTable> = {
	args: {
		data: payments.slice(0, 3),
		pageSize: 10,
		empty: 'No payments.',
	},
	render: args => (
		<DataTable
			{...args}
			columns={columns}
			data={payments.slice(0, 3)}
			getRowId={(payment: Payment) => payment.id}
			search={false}
			columnVisibility={false}
		/>
	),
	play: async ({ canvas }) => {
		const action = canvas.querySelector<HTMLButtonElement>('[data-slot="dropdown-menu-trigger"]')
		if (!action) throw new Error('DataTable row actions were not rendered')
		action.click()
		await new Promise(resolve => setTimeout(resolve))
		if (!document.querySelector('[data-slot="dropdown-menu-content"]')) {
			throw new Error('DataTable row action menu did not open')
		}
	},
}
