/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from './app'
import { Button, DataTable, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '/src/ui'
import type { DataTableColumn } from '/src/ui'

type Payment = {
	id: string
	amount: number
	status: 'failed' | 'pending' | 'processing' | 'success'
	email: string
	tags: readonly ('international' | 'priority')[]
}

const payments: readonly Payment[] = [
	{ id: 'm5gr84i9', amount: 316, status: 'success', email: 'ken99@example.com', tags: ['international'] },
	{ id: '3u1reuv4', amount: 242, status: 'success', email: 'abe45@example.com', tags: ['priority'] },
	{ id: 'derv1ws0', amount: 837, status: 'processing', email: 'monserrat44@example.com', tags: ['international', 'priority'] },
	{ id: '5kma53ae', amount: 874, status: 'success', email: 'silas22@example.com', tags: [] },
	{ id: 'bhqecj4p', amount: 721, status: 'failed', email: 'carmella@example.com', tags: ['priority'] },
	{ id: 'x1n9p0ab', amount: 125, status: 'pending', email: 'm@example.com', tags: ['international'] },
]

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

const statusOptions = [
	{ label: 'Success', value: 'success', icon: <span class="i-lucide-check-circle" /> },
	{ label: 'Processing', value: 'processing', icon: <span class="i-lucide-loader-circle" /> },
	{ label: 'Pending', value: 'pending', icon: <span class="i-lucide-clock" /> },
	{ label: 'Failed', value: 'failed', icon: <span class="i-lucide-x-circle" /> },
] as const

const columns: readonly DataTableColumn<Payment>[] = [
	{
		label: 'Status',
		value: 'status',
		facet: {
			label: 'Status',
			options: statusOptions,
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

const filterColumns: readonly DataTableColumn<Payment>[] = [
	{
		label: 'Status',
		value: 'status',
		search: false,
		facet: { label: 'Status', options: statusOptions },
		cell: payment => <span class="capitalize">{payment.status}</span>,
	},
	{
		label: 'Email',
		value: 'email',
		search: payment => `${payment.email} ${payment.id}`,
	},
	{
		id: 'tags',
		label: 'Tags',
		value: payment => payment.tags.join(', '),
		search: false,
		facet: {
			label: 'Tags',
			options: [
				{ label: 'International', value: 'international' },
				{ label: 'Priority', value: 'priority' },
			],
			values: payment => payment.tags,
		},
		cell: payment => payment.tags.length ? payment.tags.join(', ') : 'None',
	},
]

const statusOrder: Record<Payment['status'], number> = {
	processing: 0,
	failed: 1,
	success: 2,
	pending: 3,
}

const sortingColumns: readonly DataTableColumn<Payment>[] = [
	{
		id: 'source',
		label: 'Source position',
		header: <><span aria-hidden="true">#</span><span class="sr-only">Source position</span></>,
		align: 'center',
		cell: (_payment, context) => String(context.sourceIndex + 1),
		sort: false,
	},
	{
		label: 'Status',
		value: 'status',
		sort: (left, right) => statusOrder[left.status] - statusOrder[right.status],
		cell: payment => <span class="capitalize">{payment.status}</span>,
	},
	{
		label: 'Email',
		value: 'email',
		sort: false,
	},
	{
		id: 'recipient',
		label: 'Recipient',
		value: payment => payment.email.split('@')[0],
		cell: (_payment, context) => (
			<span data-cell-context={`${context.columnId}:${String(context.value)}:${context.sourceIndex}`}>
				{String(context.value)}
			</span>
		),
	},
	{
		label: 'Amount',
		value: 'amount',
		align: 'right',
		cell: payment => money.format(payment.amount),
	},
]

const visibilityColumns: readonly DataTableColumn<Payment>[] = [
	{ label: 'Status', value: 'status', cell: payment => <span class="capitalize">{payment.status}</span> },
	{ label: 'Email', value: 'email', defaultHidden: true },
	{ label: 'Amount', value: 'amount', align: 'right', defaultHidden: true, cell: payment => money.format(payment.amount) },
]

const compactColumns: readonly DataTableColumn<Payment>[] = columns.slice(0, 3)
const actionColumns: readonly DataTableColumn<Payment>[] = columns.map(column => ({ ...column, hideable: false }))
const liveColumns: readonly DataTableColumn<Payment>[] = [
	...compactColumns,
	{
		id: 'tags',
		label: 'Tags',
		value: payment => payment.tags.join(', '),
		cell: payment => payment.tags.length ? payment.tags.join(', ') : 'None',
	},
]

const spanishStatus: Record<Payment['status'], string> = {
	failed: 'Fallido',
	pending: 'Pendiente',
	processing: 'Procesando',
	success: 'Exitoso',
}

const localizedColumns: readonly DataTableColumn<Payment>[] = [
	{
		label: 'Estado',
		value: 'status',
		facet: {
			label: 'Estado',
			options: [
				{ label: 'Exitoso', value: 'success' },
				{ label: 'Procesando', value: 'processing' },
				{ label: 'Pendiente', value: 'pending' },
				{ label: 'Fallido', value: 'failed' },
			],
		},
		cell: payment => spanishStatus[payment.status],
	},
	{ label: 'Correo', value: 'email' },
	{ label: 'Importe', value: 'amount', align: 'right', cell: payment => money.format(payment.amount) },
]

const localizedLabels = {
	columns: 'Columnas',
	deselectPage: 'Deseleccionar página',
	deselectResults: 'Deseleccionar resultados filtrados',
	deselectRow: (row: string) => `Deseleccionar ${row}`,
	firstPage: 'Primera página',
	lastPage: 'Última página',
	nextPage: 'Página siguiente',
	page: (page: number, pages: number) => `Página ${page} de ${pages}`,
	pagination: (table: string) => `Paginación de ${table}`,
	previousPage: 'Página anterior',
	reset: 'Restablecer',
	results: (count: number) => `${count} ${count === 1 ? 'resultado' : 'resultados'}`,
	rowsPerPage: 'Filas por página',
	search: 'Buscar pagos',
	selectPage: 'Seleccionar página',
	selectResults: 'Seleccionar resultados filtrados',
	selectRow: (row: string) => `Seleccionar ${row}`,
	selected: (selected: number, total: number) => `${selected} de ${total} seleccionadas.`,
	sort: (column: string, next: 'ascending' | 'descending' | 'none') => {
		const direction = { ascending: 'ascendente', descending: 'descendente', none: 'sin orden' }[next]
		return `Ordenar ${column}: ${direction}`
	},
	toolbar: (table: string) => `Herramientas de ${table}`,
} as const

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
	rows(canvas).filter(row => row.querySelector('[data-slot="table-cell"]'))

const cells = (canvas: HTMLElement, columnId: string) =>
	dataRows(canvas).map(row => row.querySelector<HTMLElement>(`[data-slot="table-cell"][data-column-id="${columnId}"]`)?.textContent?.trim() ?? '')

const frame = () => new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

const sortTrigger = (canvas: HTMLElement, columnId: string) =>
	canvas.querySelector<HTMLButtonElement>(`[data-slot="table-head"][data-column-id="${columnId}"] [data-slot="data-table-sort-trigger"]`)

const pageAction = (canvas: HTMLElement, action: 'first' | 'last' | 'next' | 'previous') =>
	canvas.querySelector<HTMLButtonElement>(`[data-slot="data-table-pagination-action"][data-action="${action}"]`)

const menuItem = (canvas: HTMLElement, label: string) =>
	canvas.querySelector<HTMLElement>(`[data-slot="menu-checkbox-item"][data-label="${label}"]`)

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
let transformedKeys: readonly string[] = []
let transformedEvent: Event | undefined

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

const ImmutableSnapshotsExample: Stateful = function* () {
	let rows = payments.slice(0, 4)
	let columns = compactColumns
	const reverse = () => this.next(() => rows = [...rows].reverse())
	const removeKen = () => this.next(() => rows = rows.filter(payment => payment.id !== 'm5gr84i9'))
	const extendSchema = () => this.next(() => columns = liveColumns)

	while (true) yield (
		<div class="grid gap-3">
			<div class="flex gap-2">
				<Button data-story-action="reverse" set:onclick={reverse} size="sm" type="button" variant="outline">Reverse snapshot</Button>
				<Button data-story-action="remove-ken" set:onclick={removeKen} size="sm" type="button" variant="outline">Remove Ken</Button>
				<Button data-story-action="extend-schema" set:onclick={extendSchema} size="sm" type="button" variant="outline">Add tags column</Button>
			</div>
			<DataTable
				columns={columns}
				getRowKey={getPaymentKey}
				label="Live payments"
				pagination={false}
				rows={rows}
				selection={{ getRowLabel: getPaymentLabel }}
			/>
		</div>
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

export const SearchAndFacets: Story<typeof DataTable> = {
	render: () => (
		<DataTable
			columns={filterColumns}
			getRowKey={getPaymentKey}
			label="Filterable payments"
			pagination={false}
			rows={payments}
			search={{ placeholder: 'Search email, ID, or source row...' }}
		/>
	),
	play: async ({ canvas }) => {
		const search = canvas.querySelector<HTMLInputElement>('[data-slot="data-table-search"]')
		const facets = () => Array.from(canvas.querySelectorAll<HTMLButtonElement>('[data-slot="data-table-facet"]'))
		const facet = (label: string) => facets().find(trigger => trigger.textContent?.includes(label))
		if (!search || !facet('Status') || !facet('Tags')) throw new Error('DataTable search or facet controls were not rendered')

		type(search, 'success')
		await waitUntil(() => dataRows(canvas).length === 0)
		if (!canvas.querySelector('[data-slot="data-table-empty"]')) {
			throw new Error('DataTable search:false columns still participated in global search')
		}

		type(search, 'm5gr84i9')
		await waitUntil(() => dataRows(canvas).length === 1)
		if (!cells(canvas, 'email')[0]?.includes('ken99@example.com')) {
			throw new Error('DataTable custom search mapper did not expose the payment ID')
		}

		canvas.querySelector<HTMLButtonElement>('[data-slot="data-table-reset"]')?.click()
		await waitUntil(() => dataRows(canvas).length === payments.length)

		facet('Status')?.click()
		await frame()
		menuItem(canvas, 'Success')?.click()
		await waitUntil(() => dataRows(canvas).length === 3)
		menuItem(canvas, 'Processing')?.click()
		await waitUntil(() => dataRows(canvas).length === 4)
		if (facet('Status')?.querySelector('[data-slot="data-table-facet-count"]')?.textContent !== '2') {
			throw new Error('DataTable did not expose the two active options in one facet')
		}
		if (cells(canvas, 'status').some(status => status !== 'success' && status !== 'processing')) {
			throw new Error('DataTable facet options did not compose with OR semantics')
		}

		facet('Tags')?.click()
		await frame()
		menuItem(canvas, 'Priority')?.click()
		await waitUntil(() => dataRows(canvas).length === 2)
		if (cells(canvas, 'email').join('|') !== 'abe45@example.com|monserrat44@example.com') {
			throw new Error('DataTable facets did not compose with AND semantics')
		}
		if (facet('Tags')?.querySelector('[data-slot="data-table-facet-count"]')?.textContent !== '1') {
			throw new Error('DataTable multi-value facet did not expose its active count')
		}

		canvas.querySelector<HTMLButtonElement>('[data-slot="data-table-reset"]')?.click()
		await waitUntil(() => dataRows(canvas).length === payments.length)
		if (canvas.querySelector('[data-slot="data-table-facet-count"]')) {
			throw new Error('DataTable reset did not clear all facet counts')
		}
	},
}

export const Sorting: Story<typeof DataTable> = {
	render: () => (
		<DataTable
			columns={sortingColumns}
			getRowKey={getPaymentKey}
			label="Sortable payments"
			pagination={false}
			rows={payments}
		/>
	),
	play: async ({ canvas }) => {
		if (sortTrigger(canvas, 'source') || sortTrigger(canvas, 'email')) {
			throw new Error('DataTable rendered sort controls for display or sort:false columns')
		}
		if (!sortTrigger(canvas, 'status') || !sortTrigger(canvas, 'recipient') || !sortTrigger(canvas, 'amount')) {
			throw new Error('DataTable omitted a sortable value column')
		}
		if (canvas.querySelector<HTMLElement>('[data-cell-context]')?.dataset.cellContext !== 'recipient:ken99:0') {
			throw new Error('DataTable cell context did not expose columnId, accessor value, and sourceIndex')
		}

		sortTrigger(canvas, 'status')?.click()
		await waitUntil(() => canvas.querySelector('[data-column-id="status"][aria-sort="ascending"]') != null)
		if (cells(canvas, 'status')[0] !== 'processing') {
			throw new Error('DataTable custom comparator was not used for ascending sort')
		}
		if (canvas.querySelectorAll('[aria-sort]').length !== 1) throw new Error('DataTable exposed more than one sorted column')

		sortTrigger(canvas, 'status')?.click()
		await waitUntil(() => canvas.querySelector('[data-column-id="status"][aria-sort="descending"]') != null)
		if (cells(canvas, 'status')[0] !== 'pending') throw new Error('DataTable descending sort did not reverse the comparator')

		sortTrigger(canvas, 'status')?.click()
		await waitUntil(() => canvas.querySelector('[aria-sort]') == null)
		if (cells(canvas, 'source').join(',') !== '1,2,3,4,5,6') {
			throw new Error('DataTable third sort activation did not restore source order')
		}

		sortTrigger(canvas, 'recipient')?.click()
		await waitUntil(() => cells(canvas, 'recipient')[0] === 'abe45')
		if (canvas.querySelector('[data-column-id="recipient"]')?.getAttribute('aria-sort') !== 'ascending') {
			throw new Error('DataTable function accessor did not participate in sorting')
		}

		sortTrigger(canvas, 'amount')?.click()
		await waitUntil(() => cells(canvas, 'amount')[0] === '$125.00')
		if (canvas.querySelectorAll('[aria-sort]').length !== 1) {
			throw new Error('DataTable did not preserve its single-sort contract')
		}
	},
}

export const Pagination: Story<typeof DataTable> = {
	render: () => (
		<DataTable
			columns={compactColumns}
			getRowKey={getPaymentKey}
			label="Paginated payments"
			pagination={{ defaultSize: 2, sizes: [2, 3, 6] }}
			rows={payments}
		/>
	),
	play: async ({ canvas }) => {
		const indicator = () => canvas.querySelector('[data-slot="data-table-page-indicator"]')?.textContent?.trim()
		const expectBoundary = (start: boolean) => {
			const actions = (['first', 'previous', 'next', 'last'] as const)
				.map(action => pageAction(canvas, action)?.disabled)
			const expected = start ? [true, true, false, false] : [false, false, true, true]
			if (actions.some((disabled, index) => disabled !== expected[index])) {
				throw new Error(`DataTable pagination ${start ? 'start' : 'end'} boundary was incorrect`)
			}
		}

		if (indicator() !== 'Page 1 of 3' || dataRows(canvas).length !== 2) {
			throw new Error('DataTable did not render its configured initial page')
		}
		expectBoundary(true)

		pageAction(canvas, 'next')?.click()
		await waitUntil(() => indicator() === 'Page 2 of 3')
		if (cells(canvas, 'email').join('|') !== 'monserrat44@example.com|silas22@example.com') {
			throw new Error('DataTable next page action skipped logical rows')
		}

		pageAction(canvas, 'last')?.click()
		await waitUntil(() => indicator() === 'Page 3 of 3')
		expectBoundary(false)

		pageAction(canvas, 'previous')?.click()
		await waitUntil(() => indicator() === 'Page 2 of 3')
		pageAction(canvas, 'first')?.click()
		await waitUntil(() => indicator() === 'Page 1 of 3')

		pageAction(canvas, 'last')?.click()
		await waitUntil(() => indicator() === 'Page 3 of 3')
		const size = canvas.querySelector<HTMLButtonElement>('[data-slot="data-table-page-size"] [data-slot="select-trigger"]')
		const options = Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot="select-item"]')).map(item => item.dataset.value)
		if (!size || options.join(',') !== '2,3,6') throw new Error('DataTable page-size options did not match the public configuration')
		size.click()
		await frame()
		canvas.querySelector<HTMLElement>('[data-slot="select-item"][data-value="3"]')?.click()
		await waitUntil(() => indicator() === 'Page 1 of 2' && dataRows(canvas).length === 3)
		if (!canvas.querySelector('[data-slot="data-table-page-size"] [data-slot="select-trigger"]')?.textContent?.includes('3')) {
			throw new Error('DataTable page-size trigger did not expose the committed size')
		}
	},
}

export const SelectionAcrossTransforms: Story<typeof DataTable> = {
	render: () => {
		transformedKeys = []
		transformedEvent = undefined
		return (
			<DataTable
				columns={compactColumns}
				getRowKey={getPaymentKey}
				label="Selectable payments"
				pagination={{ defaultSize: 2, sizes: [2] }}
				rows={payments}
				search={{ placeholder: 'Filter selected payments...' }}
				selection={{
					defaultValue: ['m5gr84i9'],
					getRowLabel: getPaymentLabel,
					onValueChange: (keys, event) => {
						transformedKeys = keys
						transformedEvent = event
					},
				}}
			/>
		)
	},
	play: async ({ canvas }) => {
		const summary = () => canvas.querySelector('[data-slot="data-table-selection-summary"]')?.textContent
		const header = () => canvas.querySelector<HTMLInputElement>('[data-slot="table-head"] [data-slot="checkbox-input"]')
		const checkbox = (email: string) => canvas.querySelector<HTMLInputElement>(`[data-slot="table-body"] [aria-label$="${email}"]`)
		if (!checkbox('ken99@example.com')?.checked || !header()?.indeterminate || !summary()?.includes('1 of 6')) {
			throw new Error('DataTable did not apply uncontrolled defaultValue as a partial page selection')
		}

		header()?.click()
		await waitUntil(() => transformedKeys.length === 2 && header()?.checked === true)
		if (transformedKeys.join(',') !== 'm5gr84i9,3u1reuv4') {
			throw new Error('DataTable page selection did not emit source-ordered stable keys')
		}
		if (transformedEvent?.type !== 'change') {
			throw new Error('DataTable selection did not preserve the originating DOM event')
		}

		pageAction(canvas, 'next')?.click()
		await waitUntil(() => cells(canvas, 'email')[0] === 'monserrat44@example.com')
		if (header()?.checked || header()?.indeterminate) throw new Error('DataTable select-page state leaked across pages')
		checkbox('monserrat44@example.com')?.click()
		await waitUntil(() => transformedKeys.length === 3)

		sortTrigger(canvas, 'email')?.click()
		await waitUntil(() => cells(canvas, 'email')[0] === 'abe45@example.com')
		if (!checkbox('abe45@example.com')?.checked || !header()?.indeterminate) {
			throw new Error('DataTable selection did not persist by key across sorting')
		}

		const search = canvas.querySelector<HTMLInputElement>('[data-slot="data-table-search"]')
		if (!search) throw new Error('Selectable DataTable search was not rendered')
		type(search, 'monserrat')
		await waitUntil(() => dataRows(canvas).length === 1)
		if (!checkbox('monserrat44@example.com')?.checked || !header()?.checked || !summary()?.includes('3 of 6')) {
			throw new Error('DataTable selection did not persist across filtering or preserve source totals')
		}
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

export const Unpaginated: Story<typeof DataTable> = {
	render: () => (
		<DataTable
			columns={compactColumns}
			getRowKey={getPaymentKey}
			label="Unpaginated payments"
			pagination={false}
			rows={payments}
			search={{ placeholder: 'Filter all payments...' }}
			selection={{ getRowLabel: getPaymentLabel }}
		/>
	),
	play: async ({ canvas }) => {
		if (dataRows(canvas).length !== payments.length) throw new Error('Unpaginated DataTable did not mount every source row')
		if (canvas.querySelector('[data-slot="data-table-pagination"]')) throw new Error('Unpaginated DataTable rendered pagination controls')
		const header = () => canvas.querySelector<HTMLInputElement>('[data-slot="table-head"] [data-slot="checkbox-input"]')
		if (header()?.getAttribute('aria-label') !== 'Select filtered results') {
			throw new Error('Unpaginated DataTable select-all control described a page instead of filtered results')
		}

		const search = canvas.querySelector<HTMLInputElement>('[data-slot="data-table-search"]')
		if (!search) throw new Error('Unpaginated DataTable search was not rendered')
		type(search, 'success')
		await waitUntil(() => dataRows(canvas).length === 3)

		header()?.click()
		await waitUntil(() => Array.from(canvas.querySelectorAll<HTMLInputElement>('[data-slot="table-body"] [data-slot="checkbox-input"]')).every(input => input.checked))
		if (!canvas.querySelector('[data-slot="data-table-selection-summary"]')?.textContent?.includes('3 of 6')) {
			throw new Error('Unpaginated DataTable did not select all filtered rows against the source total')
		}
		if (header()?.getAttribute('aria-label') !== 'Deselect filtered results') {
			throw new Error('Unpaginated DataTable did not update its select-all action label')
		}

		type(search, '')
		await waitUntil(() => dataRows(canvas).length === payments.length)
		if (!header()?.indeterminate || header()?.checked) {
			throw new Error('Unpaginated DataTable did not preserve a filtered selection as partial source selection')
		}
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

export const ColumnVisibility: Story<typeof DataTable> = {
	render: () => (
		<DataTable
			columns={visibilityColumns}
			getRowKey={getPaymentKey}
			label="Configurable payment columns"
			pagination={false}
			rows={payments}
		/>
	),
	play: async ({ canvas }) => {
		const visible = () => Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot="table-head"][data-column-id]'))
			.map(header => header.dataset.columnId)
		const trigger = canvas.querySelector<HTMLButtonElement>('[data-slot="data-table-columns"]')
		if (!trigger || visible().join(',') !== 'status') {
			throw new Error('DataTable did not honor defaultHidden columns')
		}

		trigger.click()
		await frame()
		if (menuItem(canvas, 'Status')?.getAttribute('aria-disabled') !== 'true') {
			throw new Error('DataTable allowed hiding its last visible column')
		}
		if (menuItem(canvas, 'Email')?.getAttribute('aria-checked') !== 'false' || menuItem(canvas, 'Amount')?.getAttribute('aria-checked') !== 'false') {
			throw new Error('DataTable visibility menu did not reflect defaultHidden state')
		}

		menuItem(canvas, 'Amount')?.click()
		await waitUntil(() => visible().join(',') === 'status,amount')
		if (menuItem(canvas, 'Status')?.getAttribute('aria-disabled') === 'true') {
			throw new Error('DataTable kept a column disabled after another became visible')
		}

		menuItem(canvas, 'Status')?.click()
		await waitUntil(() => visible().join(',') === 'amount')
		if (menuItem(canvas, 'Amount')?.getAttribute('aria-disabled') !== 'true') {
			throw new Error('DataTable did not move the last-visible guard to the remaining column')
		}
		if (dataRows(canvas)[0]?.querySelector('[data-column-id="status"]')) {
			throw new Error('DataTable left hidden column cells mounted')
		}
	},
}

export const RowActions: Story<typeof DataTable> = {
	args: {
		rows: payments.slice(0, 3),
		empty: 'No payments.',
	},
	render: args => (
		<DataTable
			{...args}
			columns={actionColumns}
			getRowKey={getPaymentKey}
			label="Payments"
			pagination={{ defaultSize: 10 }}
			rows={payments.slice(0, 3)}
		/>
	),
	play: async ({ canvas }) => {
		if (canvas.querySelector('[data-slot="data-table-columns"]')) {
			throw new Error('DataTable rendered a visibility menu when every column is fixed')
		}
		const action = canvas.querySelector<HTMLButtonElement>('[data-slot="table-body"] [data-slot="menu-trigger"]')
		if (!action) throw new Error('DataTable row actions were not rendered')
		action.click()
		await frame()
		const content = canvas.querySelector<HTMLElement>('[data-slot="menu-content"]')
		if (action.getAttribute('aria-expanded') !== 'true' || !content || getComputedStyle(content).display === 'none') {
			throw new Error('DataTable row action menu did not open')
		}
	},
}

export const Localized: Story<typeof DataTable> = {
	render: () => (
		<DataTable
			columns={localizedColumns}
			getRowKey={getPaymentKey}
			label="Pagos"
			labels={localizedLabels}
			pagination={{ defaultSize: 2, sizes: [2, 3] }}
			rows={payments.slice(0, 3)}
			search={{ placeholder: 'Buscar por correo...' }}
			selection={{ getRowLabel: getPaymentLabel }}
		/>
	),
	play: async ({ canvas }) => {
		const table = canvas.querySelector<HTMLTableElement>('[data-slot="table"]')
		const toolbar = canvas.querySelector('[data-slot="data-table-toolbar"]')
		const pagination = canvas.querySelector('[data-slot="data-table-pagination"]')
		const search = canvas.querySelector<HTMLInputElement>('[data-slot="data-table-search"]')
		const selectPage = canvas.querySelector<HTMLInputElement>('[data-slot="table-head"] [data-slot="checkbox-input"]')
		if (
			table?.getAttribute('aria-label') !== 'Pagos'
			|| toolbar?.getAttribute('aria-label') !== 'Herramientas de Pagos'
			|| pagination?.getAttribute('aria-label') !== 'Paginación de Pagos'
			|| search?.getAttribute('aria-label') !== 'Buscar pagos'
			|| selectPage?.getAttribute('aria-label') !== 'Seleccionar página'
		) throw new Error('DataTable did not apply localized accessible names')

		if (
			canvas.querySelector('[data-slot="data-table-page-indicator"]')?.textContent?.trim() !== 'Página 1 de 2'
			|| !canvas.querySelector('[data-slot="data-table-selection-summary"]')?.textContent?.includes('0 de 3 seleccionadas.')
			|| pageAction(canvas, 'first')?.getAttribute('aria-label') !== 'Primera página'
			|| pageAction(canvas, 'next')?.getAttribute('aria-label') !== 'Página siguiente'
		) throw new Error('DataTable did not localize pagination or selection copy')

		if (sortTrigger(canvas, 'status')?.getAttribute('aria-label') !== 'Ordenar Estado: ascendente') {
			throw new Error('DataTable did not localize its next sort action')
		}

		type(search!, 'monserrat')
		await waitUntil(() => dataRows(canvas).length === 1 && announced() === '1 resultado')
		const reset = canvas.querySelector<HTMLButtonElement>('[data-slot="data-table-reset"]')
		if (reset?.textContent?.trim() !== 'Restablecer') throw new Error('DataTable did not localize its reset action')
	},
}

export const ImmutableSnapshots: Story<typeof DataTable> = {
	render: () => <ImmutableSnapshotsExample />,
	play: async ({ canvas }) => {
		const summary = () => canvas.querySelector('[data-slot="data-table-selection-summary"]')?.textContent
		const ken = () => canvas.querySelector<HTMLInputElement>('[data-slot="table-body"] [aria-label$="ken99@example.com"]')
		if (cells(canvas, 'email')[0] !== 'ken99@example.com') throw new Error('Live DataTable did not render the initial snapshot')

		ken()?.click()
		await waitUntil(() => ken()?.checked === true && summary()?.includes('1 of 4') === true)

		canvas.querySelector<HTMLButtonElement>('[data-story-action="extend-schema"]')?.click()
		await waitUntil(() => canvas.querySelector('[data-slot="table-head"][data-column-id="tags"]') != null)
		if (!ken()?.checked || cells(canvas, 'tags')[0] !== 'international') {
			throw new Error('DataTable did not reconcile a replaced immutable column schema by ID')
		}

		canvas.querySelector<HTMLButtonElement>('[data-story-action="reverse"]')?.click()
		await waitUntil(() => cells(canvas, 'email')[0] === 'silas22@example.com')
		if (!ken()?.checked || dataRows(canvas).at(-1)?.textContent?.includes('ken99@example.com') !== true) {
			throw new Error('DataTable selection did not follow its stable key through a reordered snapshot')
		}

		canvas.querySelector<HTMLButtonElement>('[data-story-action="remove-ken"]')?.click()
		await waitUntil(() => dataRows(canvas).length === 3 && summary()?.includes('0 of 3') === true)
		if (ken()) throw new Error('DataTable retained a row removed from the immutable snapshot')
	},
}
