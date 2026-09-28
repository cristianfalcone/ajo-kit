/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from 'ajo-ui-playa/table'

const invoices = [
	{ invoice: 'INV001', status: 'Paid', method: 'Credit Card', amount: '$250.00' },
	{ invoice: 'INV002', status: 'Pending', method: 'PayPal', amount: '$150.00' },
	{ invoice: 'INV003', status: 'Unpaid', method: 'Bank Transfer', amount: '$350.00' },
	{ invoice: 'INV004', status: 'Paid', method: 'Credit Card', amount: '$450.00' },
	{ invoice: 'INV005', status: 'Paid', method: 'PayPal', amount: '$550.00' },
	{ invoice: 'INV006', status: 'Pending', method: 'Bank Transfer', amount: '$200.00' },
	{ invoice: 'INV007', status: 'Unpaid', method: 'Credit Card', amount: '$300.00' },
]

export default {
	title: 'UI/Table',
	component: Table,
	parameters: {
		docs: { description: 'Responsive semantic table composition matching the Ajo Kit Table API.' },
	},
} satisfies Meta<typeof Table>

const assertTable = (canvas: HTMLElement) => {
	const container = canvas.querySelector<HTMLElement>('[data-slot="table-container"]')
	const table = canvas.querySelector<HTMLTableElement>('[data-slot="table"]')
	if (!container || !table) throw new Error('Table container or table was not rendered')
	if (container.firstElementChild !== table) throw new Error('Table must be wrapped by the responsive container')
	if (!table.querySelector('[data-slot="table-header"]')) throw new Error('TableHeader was not rendered')
	if (!table.querySelector('[data-slot="table-body"]')) throw new Error('TableBody was not rendered')
	if (container.getAttribute('role') !== 'region' || container.tabIndex !== 0 || !container.getAttribute('aria-label')) {
		throw new Error('A named Table should make its container a focusable, named region')
	}
	if (table.hasAttribute('aria-label')) throw new Error('The table name belongs to the region only, so it is announced once')
	const caption = table.querySelector<HTMLElement>('[data-slot="table-caption"]')
	const cell = table.querySelector<HTMLElement>('[data-slot="table-cell"]')
	if (caption && cell && getComputedStyle(caption).paddingInlineStart !== getComputedStyle(cell).paddingInlineStart) {
		throw new Error('The caption starts where the cell text starts, clear of the border')
	}
	const numbers = [...table.querySelectorAll<HTMLElement>('.text-end')]
	if (!numbers.length) throw new Error('Each Table story shows a number column')
	for (const number of numbers) {
		const style = getComputedStyle(number)
		if (style.textAlign !== 'end' || style.fontVariantNumeric !== 'tabular-nums') {
			throw new Error('Number heads and cells sit at the logical end with tabular figures')
		}
	}
}

export const Default: Story<typeof Table> = {
	args: {
		caption: 'A list of your recent invoices.',
		total: '$2,500.00',
		invoices,
		'aria-label': 'Invoices',
	},
	render: ({ caption, invoices, total, ...args }) => (
		<Table {...args}>
			<TableCaption>{caption}</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead class="w-[100px]">Invoice</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Method</TableHead>
					<TableHead class="text-end tabular-nums">Amount</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{invoices.map((invoice: typeof invoices[number]) => (
					<TableRow key={invoice.invoice}>
						<TableCell class="font-medium">{invoice.invoice}</TableCell>
						<TableCell>{invoice.status}</TableCell>
						<TableCell>{invoice.method}</TableCell>
						<TableCell class="text-end tabular-nums">{invoice.amount}</TableCell>
					</TableRow>
				))}
			</TableBody>
			<TableFooter>
				<TableRow>
					<TableCell colspan={3}>Total</TableCell>
					<TableCell class="text-end tabular-nums">{total}</TableCell>
				</TableRow>
			</TableFooter>
		</Table>
	),
	play: async ({ canvas }) => {
		assertTable(canvas)
		const table = canvas.querySelector<HTMLTableElement>('[data-slot="table"]')
		if (table?.firstElementChild?.getAttribute('data-slot') !== 'table-caption') {
			throw new Error('TableCaption should be the first table child for native semantics')
		}
		if (table.querySelectorAll('[data-slot="table-head"][scope="col"]').length !== 4) {
			throw new Error('TableHead should default to column scope')
		}
		if (!table.querySelector('[data-slot="table-footer"]')) throw new Error('TableFooter was not rendered')
	},
}

export const SelectableRows: Story<typeof Table> = {
	args: {
		tokens: [
			{ token: 'seed-api-token', owner: 'Admin', days: 90, selected: true },
			{ token: 'support-token', owner: 'Support', days: 14, selected: false },
		],
		'aria-label': 'API tokens',
	},
	render: ({ tokens, ...args }) => (
		<Table {...args}>
			<TableHeader>
				<TableRow>
					<TableHead>Token</TableHead>
					<TableHead>Owner</TableHead>
					<TableHead class="text-end tabular-nums">Days left</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{tokens.map((row: { token: string; owner: string; days: number; selected?: boolean }) => (
					<TableRow key={row.token} data-state={row.selected ? 'selected' : undefined}>
						<TableCell class="font-medium">{row.token}</TableCell>
						<TableCell>{row.owner}</TableCell>
						<TableCell class="text-end tabular-nums">{row.days}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	),
	play: async ({ canvas }) => {
		assertTable(canvas)
		if (!canvas.querySelector('[data-slot="table-row"][data-state="selected"]')) {
			throw new Error('Selected table rows should preserve data-state')
		}
	},
}

export const Dense: Story<typeof Table> = {
	args: {
		routes: [
			{ route: '/account/chats', topics: 'chat:list, unread', version: 42 },
			{ route: '/account/profile', topics: 'account:self', version: 7 },
		],
		'aria-label': 'Route versions',
	},
	render: ({ routes, ...args }) => (
		<Table {...args}>
			<TableHeader>
				<TableRow>
					<TableHead class="h-8 py-1">Route</TableHead>
					<TableHead class="h-8 py-1">Topics</TableHead>
					<TableHead class="h-8 py-1 text-end tabular-nums">Version</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{routes.map((row: { route: string; topics: string; version: number }) => (
					<TableRow key={row.route}>
						<TableCell class="py-1 font-mono text-xs">{row.route}</TableCell>
						<TableCell class="py-1">{row.topics}</TableCell>
						<TableCell class="py-1 text-end tabular-nums font-mono text-xs">{row.version}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	),
	play: async ({ canvas }) => assertTable(canvas),
}

export const Wide: Story<typeof Table> = {
	parameters: { layout: 'fullscreen' },
	args: {
		caption: 'Horizontal overflow stays inside the table container.',
		components: [
			{ component: 'Menu', status: 'Done', coverage: 'Default, checkbox, radio, submenu', interaction: 'Popover, keyboard, pointer', stories: 7 },
			{ component: 'Command', status: 'Done', coverage: 'Filtering, groups, empty state', interaction: 'Input, selection, dialog', stories: 5 },
		],
		'aria-label': 'Component coverage',
	},
	render: ({ caption, components, ...args }) => (
		<div class="w-80 p-6">
			<Table {...args} class="min-w-[720px]">
				<TableCaption>{caption}</TableCaption>
				<TableHeader>
					<TableRow>
						<TableHead>Component</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Story coverage</TableHead>
						<TableHead>Interaction</TableHead>
						<TableHead class="text-end tabular-nums">Stories</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{components.map((row: { component: string; status: string; coverage: string; interaction: string; stories: number }) => (
						<TableRow key={row.component}>
							<TableCell class="font-medium">{row.component}</TableCell>
							<TableCell>{row.status}</TableCell>
							<TableCell>{row.coverage}</TableCell>
							<TableCell>{row.interaction}</TableCell>
							<TableCell class="text-end tabular-nums">{row.stories}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	),
	play: async ({ canvas }) => {
		const container = canvas.querySelector<HTMLElement>('[data-slot="table-container"]')
		const table = canvas.querySelector<HTMLTableElement>('[data-slot="table"]')
		if (!container || !table) throw new Error('Wide table did not render')
		assertTable(canvas)
		if (container.scrollWidth <= container.clientWidth) {
			throw new Error('Wide table should overflow inside the responsive container')
		}
	},
}
