/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from './app'
import { DataTable, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '/src/ui'
import type { DataTableColumn } from '/src/ui'

type Payment = {
	id: string
	amount: number
	status: 'failed' | 'pending' | 'processing' | 'success'
	email: string
}

const payments: readonly Payment[] = [
	{ id: 'm5gr84i9', amount: 316, status: 'success', email: 'ken99@example.com' },
	{ id: '3u1reuv4', amount: 242, status: 'success', email: 'abe45@example.com' },
	{ id: 'derv1ws0', amount: 837, status: 'processing', email: 'monserrat44@example.com' },
	{ id: '5kma53ae', amount: 874, status: 'success', email: 'silas22@example.com' },
	{ id: 'bhqecj4p', amount: 721, status: 'failed', email: 'carmella@example.com' },
	{ id: 'x1n9p0ab', amount: 125, status: 'pending', email: 'm@example.com' },
]

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

const columns: readonly DataTableColumn<Payment>[] = [
	{
		label: 'Status',
		value: 'status',
		facet: {
			label: 'Status',
			options: [
				{ label: 'Success', value: 'success', icon: <span class="i-lucide-check-circle" /> },
				{ label: 'Processing', value: 'processing', icon: <span class="i-lucide-loader-circle" /> },
				{ label: 'Pending', value: 'pending', icon: <span class="i-lucide-clock" /> },
				{ label: 'Failed', value: 'failed', icon: <span class="i-lucide-x-circle" /> },
			],
		},
		cell: payment => <span class="capitalize">{payment.status}</span>,
	},
	{
		label: 'Email',
		value: 'email',
		cell: payment => <span class="lowercase">{payment.email}</span>,
	},
	{
		label: 'Amount',
		value: 'amount',
		align: 'right',
		cell: payment => <span class="font-medium">{money.format(payment.amount)}</span>,
	},
	{
		id: 'actions',
		label: 'Actions',
		header: <span class="sr-only">Actions</span>,
		hideable: false,
		align: 'right',
		cell: payment => (
			<Menu>
				<MenuTrigger class="inline-flex size-8 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground">
					<span class="sr-only">Open actions for {payment.email}</span>
					<span aria-hidden="true" class="i-lucide-ellipsis size-4" />
				</MenuTrigger>
				<MenuContent align="end">
					<MenuLabel>Actions</MenuLabel>
					<MenuItem>Copy payment ID</MenuItem>
					<MenuSeparator />
					<MenuItem>View {payment.email}</MenuItem>
				</MenuContent>
			</Menu>
		),
	},
]

const getPaymentKey = (payment: Payment) => payment.id
const getPaymentLabel = (payment: Payment) => payment.email

export default {
	title: 'UI/Data Table',
	component: DataTable,
	args: {
		rows: payments,
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

const waitUntil = async (check: () => boolean, timeout = 1200) => {
	const start = performance.now()
	while (performance.now() - start < timeout) {
		if (check()) return
		await new Promise(resolve => setTimeout(resolve, 16))
	}
	throw new Error('Timed out waiting for DataTable state')
}

const waitForVisualCheck = async (input: HTMLInputElement, label: string) => {
	const root = input.closest<HTMLElement>('[data-slot="checkbox"]')
	const indicator = root?.querySelector<HTMLElement>('[data-slot="checkbox-indicator"][data-state="checked"]')
	if (!root || !indicator) throw new Error(`${label} checked visual was not rendered`)
	const matches = () => input.checked
		&& !input.indeterminate
		&& input.dataset.state === 'checked'
		&& input.getAttribute('aria-checked') === 'true'
		&& root.dataset.state === 'checked'
		&& getComputedStyle(indicator).opacity === '1'
		&& getComputedStyle(root).backgroundColor !== 'rgba(0, 0, 0, 0)'
	try {
		await waitUntil(matches)
	} catch {
		const inputState = `${input.checked}/${input.dataset.state}/${input.getAttribute('aria-checked')}`
		const visualState = `${getComputedStyle(indicator).opacity}/${getComputedStyle(root).backgroundColor}`
		throw new Error(`${label} remained visually unchecked: input=${inputState} root=${root.dataset.state} visual=${visualState}`)
	}
}

const announced = () =>
	document.body.querySelector<HTMLElement>('[aria-live="polite"][aria-atomic="true"]')?.textContent

let selectedKeys: readonly string[] = []
let controlledKeys: readonly string[] = []
let acceptControlledSelection = true

const ControlledSelectionExample: Stateful<{ rows: readonly Payment[] }> = function* () {
	let value: readonly string[] = []
	const setValue = (next: readonly string[]) => this.next(() => {
		controlledKeys = next
		if (acceptControlledSelection) value = next
	})

	for (const { rows } of this) yield (
		<DataTable
			columns={columns}
			getRowKey={getPaymentKey}
			label="Controlled payments"
			pagination={false}
			rows={rows}
			selection={{ getRowLabel: getPaymentLabel, onValueChange: setValue, value }}
		/>
	)
}

export const Default: Story<typeof DataTable> = {
	args: {
		defaultSize: 5,
		placeholder: 'Filter emails...',
	},
	argTypes: {
		defaultSize: { control: 'select', options: [2, 5, 10], label: 'Default page size' },
		placeholder: { control: 'text', label: 'Search placeholder' },
	},
	render: ({ defaultSize, placeholder, ...args }) => {
		selectedKeys = []
		return (
			<DataTable
				{...args}
				columns={columns}
				data-story-table="root"
				getRowKey={getPaymentKey}
				id="payments-table"
				label="Payments"
				pagination={{ defaultSize: Number(defaultSize), sizes: [2, 5, 10] }}
				rows={payments}
				search={{ placeholder: String(placeholder) }}
				selection={{
					getRowLabel: getPaymentLabel,
					onValueChange: (keys: readonly string[]) => selectedKeys = keys,
				}}
			/>
		)
	},
	play: async ({ canvas }) => {
		const root = canvas.querySelector('[data-slot="data-table"]')
		const table = root?.querySelector<HTMLTableElement>('[data-slot="table"]')
		const container = root?.querySelector<HTMLElement>('[data-slot="data-table-container"]')
		if (!root || !table || !container) throw new Error('DataTable root and native table were not rendered')
		if (
			root !== canvas.firstElementChild
			|| root.id !== 'payments-table'
			|| root.getAttribute('data-story-table') !== 'root'
			|| root.hasAttribute('aria-label')
			|| table.getAttribute('aria-label') !== 'Payments'
		) {
			throw new Error('DataTable did not separate root attrs from the native table name')
		}
		if (getComputedStyle(container).overflowX !== 'auto') {
			throw new Error('DataTable horizontal overflow is not scrollable')
		}
		if (dataRows(canvas).length !== 5) throw new Error('DataTable did not paginate to the first five rows')

		const firstRow = dataRows(canvas)[0]
		for (const columnId of ['status', 'email']) {
			const label = canvas.querySelector<HTMLElement>(`[data-slot="table-head"][data-column-id="${columnId}"] [data-slot="data-table-sort-trigger"] > span:first-child`)
			const value = firstRow?.querySelector<HTMLElement>(`[data-slot="table-cell"][data-column-id="${columnId}"] > :first-child`)
			if (!label || !value || Math.abs(label.getBoundingClientRect().left - value.getBoundingClientRect().left) > 1) {
				throw new Error(`DataTable ${columnId} header is not aligned with row data`)
			}
		}
		const amountTrigger = canvas.querySelector<HTMLElement>('[data-slot="table-head"][data-column-id="amount"] [data-slot="data-table-sort-trigger"]')
		const amount = firstRow?.querySelector<HTMLElement>('[data-slot="table-cell"][data-column-id="amount"] > :first-child')
		if (!amountTrigger || !amount || Math.abs(amountTrigger.getBoundingClientRect().right - amount.getBoundingClientRect().right) > 1) {
			throw new Error('DataTable right-aligned header is not aligned with row data')
		}

		const search = canvas.querySelector<HTMLInputElement>('[data-slot="data-table-search"]')
		if (!search) throw new Error('DataTable search input was not rendered')
		type(search, 'carmella')
		await waitUntil(() => dataRows(canvas).length === 1)
		search.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }))
		await waitUntil(() => announced() === '1 result')
		const liveRegion = document.body.querySelector<HTMLElement>('[aria-live="polite"][aria-atomic="true"]')
		if (!liveRegion) throw new Error('DataTable results live region was not rendered')
		const messages = [liveRegion.textContent ?? '']
		const observer = new MutationObserver(() => { if (liveRegion.textContent) messages.push(liveRegion.textContent) })
		observer.observe(liveRegion, { childList: true, subtree: true })
		await new Promise(resolve => setTimeout(resolve, 240))
		observer.disconnect()
		if (dataRows(canvas).length !== 1 || !canvas.textContent?.includes('carmella@example.com')) {
			throw new Error('DataTable search did not filter rows')
		}
		if (announced() !== '1 result') throw new Error('DataTable did not announce its singular result label')
		if (messages.filter(message => message === '1 result').length !== 1) {
			throw new Error('DataTable Enter duplicated the pending search announcement')
		}

		const reset = canvas.querySelector<HTMLButtonElement>('[data-slot="data-table-reset"]')
		reset?.focus()
		reset?.click()
		await waitUntil(() => dataRows(canvas).length === 5 && announced() === '6 results')
		if (dataRows(canvas).length !== 5) throw new Error('DataTable reset did not restore paginated rows')
		if (announced() !== '6 results') throw new Error('DataTable did not announce its plural result label')
		if (document.activeElement !== table) throw new Error('DataTable reset left focus on the document body')

		const emailSort = Array.from(canvas.querySelectorAll<HTMLButtonElement>('[data-slot="data-table-sort-trigger"]'))
			.find(button => button.textContent?.includes('Email'))
		if (!emailSort) throw new Error('DataTable sortable header was not rendered')
		emailSort.click()
		await waitUntil(() => canvas.querySelector('[aria-sort="ascending"]') != null)
		const firstEmail = canvas.querySelector('[data-slot="table-body"] [data-slot="table-row"] [data-slot="table-cell"]:nth-child(3)')
		if (!firstEmail?.textContent?.includes('abe45@example.com')) throw new Error('DataTable ascending sort did not reorder rows')
		if (!canvas.querySelector('[aria-sort="ascending"]')) throw new Error('DataTable sorted column did not expose aria-sort')

		const firstRowCheckbox = canvas.querySelector<HTMLInputElement>('[data-slot="table-body"] [data-slot="checkbox-input"]')
		if (!firstRowCheckbox) throw new Error('DataTable row checkbox was not rendered')
		firstRowCheckbox.click()
		await waitUntil(() => selectedKeys.length === 1)
		if (selectedKeys[0] !== '3u1reuv4') throw new Error('DataTable selection did not emit the stable row key')
		const summary = canvas.querySelector('[data-slot="data-table-selection-summary"]')
		if (!summary?.textContent?.includes('1') || !summary.textContent.includes('6')) {
			throw new Error('DataTable selection summary did not update')
		}

		const nextPage = canvas.querySelector<HTMLButtonElement>('[data-action="next"]')
		if (!nextPage) throw new Error('DataTable next page action was not rendered')
		nextPage.focus()
		nextPage.click()
		await waitUntil(() => nextPage.disabled)
		if (document.activeElement !== table) throw new Error('DataTable pagination boundary left focus on the document body')
	},
}

export const ControlledSelection: Story<typeof DataTable> = {
	args: {
		rows: payments.slice(0, 2),
	},
	render: args => {
		controlledKeys = []
		acceptControlledSelection = true
		return <ControlledSelectionExample rows={args.rows} />
	},
	play: async ({ canvas }) => {
		const checkbox = canvas.querySelector<HTMLInputElement>('[data-slot="table-body"] [data-slot="checkbox-input"]')
		if (!checkbox) throw new Error('Controlled DataTable row checkbox was not rendered')
		checkbox.click()
		await waitUntil(() => controlledKeys.length === 1)
		const row = canvas.querySelector('[data-slot="table-body"] [data-slot="table-row"]')
		const summary = canvas.querySelector('[data-slot="data-table-selection-summary"]')
		await waitUntil(() => summary?.textContent?.includes('1 of 2') === true)
		const currentCheckbox = canvas.querySelector<HTMLInputElement>('[data-slot="table-body"] [data-slot="checkbox-input"]')
		if (!currentCheckbox?.checked) throw new Error('Controlled DataTable count changed without checking its row input')
		await waitForVisualCheck(currentCheckbox, 'Controlled DataTable row')
		if (controlledKeys[0] !== 'm5gr84i9') throw new Error(`Controlled DataTable emitted ${controlledKeys[0] ?? 'no key'}`)
		if (row?.getAttribute('data-state') !== 'selected') throw new Error('Controlled DataTable did not mark the selected row')
		if (!summary?.textContent?.includes('1 of 2')) throw new Error(`Controlled DataTable rendered summary ${summary?.textContent ?? 'missing'}`)

		acceptControlledSelection = false
		canvas.querySelector<HTMLInputElement>('[data-slot="table-body"] [data-slot="checkbox-input"]')!.click()
		await waitUntil(() => controlledKeys.length === 0)
		if (!canvas.querySelector<HTMLInputElement>('[data-slot="table-body"] [data-slot="checkbox-input"]')?.checked) {
			throw new Error('Controlled DataTable did not restore a rejected selection change')
		}

		const page = canvas.querySelector<HTMLInputElement>('[data-slot="table-head"] [data-slot="checkbox-input"]')
		if (!page?.indeterminate || page.checked) throw new Error('Controlled DataTable did not expose partial page selection')
		page.click()
		await waitUntil(() => controlledKeys.length === 2)
		if (!page.indeterminate || page.checked) throw new Error('Controlled DataTable did not restore a rejected page selection')

		acceptControlledSelection = true
		page.click()
		await waitUntil(() => summary?.textContent?.includes('2 of 2') === true)
		const currentPage = canvas.querySelector<HTMLInputElement>('[data-slot="table-head"] [data-slot="checkbox-input"]')
		const checked = Array.from(canvas.querySelectorAll<HTMLInputElement>('[data-slot="table-body"] [data-slot="checkbox-input"]'))
		if (!currentPage?.checked || currentPage.indeterminate || checked.some(input => !input.checked)) {
			throw new Error('Controlled DataTable did not accept page selection')
		}
		await Promise.all([currentPage, ...checked].map((input, index) =>
			waitForVisualCheck(input, index ? `Controlled DataTable row ${index}` : 'Controlled DataTable header')))
	},
}

export const Empty: Story<typeof DataTable> = {
	args: {
		rows: [],
		message: 'No payments found.',
	},
	argTypes: {
		message: { control: 'text', label: 'Empty message' },
	},
	render: ({ message, ...args }) => (
		<DataTable
			{...args}
			columns={columns}
			getRowKey={getPaymentKey}
			label="Payments"
			rows={[]}
			selection={{ getRowLabel: getPaymentLabel }}
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
		const selectPage = canvas.querySelector<HTMLInputElement>('[data-slot="table-head"] [data-slot="checkbox-input"]')
		if (!selectPage?.disabled) throw new Error('DataTable empty selection control remained enabled')
	},
}

export const HiddenColumns: Story<typeof DataTable> = {
	args: {
		defaultSize: 10,
	},
	render: ({ defaultSize, ...args }) => (
		<DataTable
			{...args}
			columns={[
				columns[0],
				columns[1],
				{ ...columns[2], defaultHidden: true },
			]}
			getRowKey={getPaymentKey}
			label="Payments"
			pagination={{ defaultSize: Number(defaultSize) }}
			rows={payments}
		/>
	),
	play: async ({ canvas }) => {
		const headers = Array.from(canvas.querySelectorAll('[data-slot="table-head"]'))
			.map(header => header.textContent?.trim())
		if (headers.includes('Amount')) throw new Error('DataTable did not honor initially hidden columns')
		const trigger = canvas.querySelector<HTMLButtonElement>('[data-slot="data-table-columns"]')
		if (!trigger) throw new Error('DataTable column visibility trigger was not rendered')
	},
}

export const ActionsOnly: Story<typeof DataTable> = {
	args: {
		rows: payments.slice(0, 3),
		empty: 'No payments.',
	},
	render: args => (
		<DataTable
			{...args}
			columns={columns.map(column => ({ ...column, hideable: false }))}
			getRowKey={getPaymentKey}
			label="Payments"
			pagination={{ defaultSize: 10 }}
			rows={payments.slice(0, 3)}
		/>
	),
	play: async ({ canvas }) => {
		const action = canvas.querySelector<HTMLButtonElement>('[data-slot="table-body"] [data-slot="menu-trigger"]')
		if (!action) throw new Error('DataTable row actions were not rendered')
		action.click()
		await new Promise(resolve => setTimeout(resolve))
		if (!document.querySelector('[data-slot="menu-content"]')) {
			throw new Error('DataTable row action menu did not open')
		}
	},
}
