/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from '../app'
import { frame, press, until } from '../play'
import { Button, buttonVariants } from 'ajo-ui-playa/button'
import { DataTable, type DataTableArgs, type DataTableColumn } from 'ajo-ui-playa/data-table'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from 'ajo-ui-playa/empty'
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from 'ajo-ui-playa/menu'
import { Skeleton } from 'ajo-ui-playa/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'ajo-ui-playa/table'
import { assertHeld, boxes, Page, t } from './page'

type Status = 'building' | 'failed' | 'live' | 'stopped'

type Deployment = {
	id: string
	app: string
	environment: 'preview' | 'production' | 'staging'
	status: Status
	author: string
	when: string
}

const people = {
	ada: () => t('Ada Lovelace', 'آدا لوفليس'),
	alan: () => t('Alan Turing', 'آلان تورينغ'),
	grace: () => t('Grace Hopper', 'غريس هوبر'),
	katherine: () => t('Katherine Johnson', 'كاثرين جونسون'),
}

// Twelve rows: one full page of ten and a second page, so pagination is real.
const deployments = (): readonly Deployment[] => [
	{ id: 'v142-7f3c9a1', app: 'shop-api', environment: 'production', status: 'live', author: people.ada(), when: t('4 minutes ago', 'منذ 4 دقائق') },
	{ id: 'v89-9d4a7b6', app: 'shop-web', environment: 'staging', status: 'building', author: people.grace(), when: t('Just now', 'الآن') },
	{ id: 'v311-b52f8a3', app: 'billing', environment: 'staging', status: 'failed', author: people.grace(), when: t('30 minutes ago', 'منذ 30 دقيقة') },
	{ id: 'v88-c01f5e2', app: 'shop-web', environment: 'production', status: 'live', author: people.grace(), when: t('1 hour ago', 'منذ ساعة') },
	{ id: 'v23-51e2c80', app: 'mailer', environment: 'production', status: 'failed', author: people.alan(), when: t('2 hours ago', 'منذ ساعتين') },
	{ id: 'v7-e8d2c47', app: 'docs', environment: 'preview', status: 'live', author: people.katherine(), when: t('5 hours ago', 'منذ 5 ساعات') },
	{ id: 'v310-0c7e4d1', app: 'billing', environment: 'production', status: 'live', author: people.ada(), when: t('6 hours ago', 'منذ 6 ساعات') },
	{ id: 'v141-2b8e0d4', app: 'shop-api', environment: 'production', status: 'stopped', author: people.ada(), when: t('Yesterday', 'أمس') },
	{ id: 'v54-7a1d9e6', app: 'search', environment: 'production', status: 'live', author: people.alan(), when: t('2 days ago', 'منذ يومين') },
	{ id: 'v22-a6b3f19', app: 'mailer', environment: 'production', status: 'live', author: people.alan(), when: t('3 days ago', 'منذ 3 أيام') },
	{ id: 'v55-4e6c2f0', app: 'search', environment: 'staging', status: 'stopped', author: people.alan(), when: t('4 days ago', 'منذ 4 أيام') },
	{ id: 'v6-3f9a0b2', app: 'docs', environment: 'preview', status: 'stopped', author: people.katherine(), when: t('Last week', 'الأسبوع الماضي') },
]

const statuses = (): Record<Status, { label: string; tone: string }> => ({
	live: { label: t('Live', 'يعمل'), tone: 'bg-success' },
	building: { label: t('Building', 'قيد البناء'), tone: 'bg-info' },
	failed: { label: t('Failed', 'فشل'), tone: 'bg-danger' },
	stopped: { label: t('Stopped', 'متوقف'), tone: 'bg-faint-foreground' },
})

const environments = () => [
	{ label: t('Production', 'الإنتاج'), value: 'production' },
	{ label: t('Staging', 'التجهيز'), value: 'staging' },
	{ label: t('Preview', 'المعاينة'), value: 'preview' },
]

const columns = (): readonly DataTableColumn<Deployment>[] => [
	{ label: t('Version', 'الإصدار'), value: 'id', cell: row => <bdi class="font-mono">{row.id}</bdi> },
	{ label: t('App', 'التطبيق'), value: 'app', cell: row => <bdi>{row.app}</bdi> },
	{
		label: t('Environment', 'البيئة'),
		value: 'environment',
		search: false,
		facet: { label: t('Environment', 'البيئة'), options: environments() },
		cell: row => environments().find(item => item.value === row.environment)?.label,
	},
	{
		label: t('Status', 'الحالة'),
		value: 'status',
		search: false,
		facet: { label: t('Status', 'الحالة'), options: Object.entries(statuses()).map(([value, { label }]) => ({ label, value })) },
		cell: row => (
			<span class="flex items-center gap-2">
				<span aria-hidden="true" class={`size-2 shrink-0 rounded-full ${statuses()[row.status].tone}`} />
				{statuses()[row.status].label}
			</span>
		),
	},
	{ label: t('Deployed by', 'نشره'), value: 'author' },
	{ label: t('When', 'متى'), value: 'when', sort: false, search: false, cell: row => <span class="text-muted-foreground">{row.when}</span> },
	{
		id: 'actions',
		label: t('Actions', 'الإجراءات'),
		header: <span class="sr-only">{t('Actions', 'الإجراءات')}</span>,
		hideable: false,
		align: 'right',
		cell: row => (
			<Menu placement="bottom-end">
				<MenuTrigger class={buttonVariants({ variant: 'ghost', size: 'icon-sm' })} data-screen-layer="row-actions">
					<span class="sr-only">{t(`Actions for ${row.id}`, `إجراءات ${row.id}`)}</span>
					<span aria-hidden="true" class="i-lucide-ellipsis" />
				</MenuTrigger>
				<MenuContent>
					<MenuItem>{t('View logs', 'عرض السجلات')}</MenuItem>
					<MenuItem>{t('Roll back to this version', 'الرجوع إلى هذا الإصدار')}</MenuItem>
					<MenuSeparator />
					<MenuItem variant="danger">{t('Remove deployment', 'إزالة عملية النشر')}</MenuItem>
				</MenuContent>
			</Menu>
		),
	},
]

// The table's own words, in the page's language.
const arabic: DataTableArgs<Deployment>['labels'] = {
	columns: 'الأعمدة',
	deselectPage: 'إلغاء تحديد الصفحة',
	deselectResults: 'إلغاء تحديد كل النتائج',
	deselectRow: label => `إلغاء تحديد ${label}`,
	firstPage: 'الصفحة الأولى',
	lastPage: 'الصفحة الأخيرة',
	nextPage: 'الصفحة التالية',
	page: (page, pages) => `الصفحة ${page} من ${pages}`,
	pagination: label => `صفحات ${label}`,
	previousPage: 'الصفحة السابقة',
	reset: 'إعادة الضبط',
	results: count => `${count} نتيجة`,
	rowsPerPage: 'صفوف في الصفحة',
	search: 'بحث',
	selectPage: 'تحديد الصفحة',
	selectResults: 'تحديد كل النتائج',
	selectRow: label => `تحديد ${label}`,
	selected: (selected, total) => `تم تحديد ${selected} من ${total}.`,
	sort: label => `فرز ${label}`,
	toolbar: label => `أدوات ${label}`,
}

const header = () => ({
	title: t('Deployments', 'عمليات النشر'),
	lead: t('Every version deployed to this host, newest first.', 'كل إصدار نُشر على هذا المضيف، الأحدث أولًا.'),
	action: <Button>{t('Deploy an app', 'انشر تطبيقًا')}</Button>,
})

// The loading table holds the loaded one's geometry: the same bar, the selection
// column and the columns with room for their sort icons, ten rows and the footer.
// Each skeleton holds an empty line of the text it stands for, or the label it
// hides, so it takes that line's height and width. Composed by hand until DataTable has a loading state (p5-kit-17).
const hidden = (label: string) => <span class="invisible">{label}</span>

const LoadingTable = () => (
	<div class="flex w-full flex-col gap-4" aria-busy="true">
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex flex-1 flex-wrap items-center gap-2">
				<Skeleton class="h-8 w-[180px] lg:w-[260px]" />
				{columns().flatMap(column => 'facet' in column && column.facet ? [(
					<Skeleton key={column.label} class="inline-flex h-8 items-center gap-2 border border-transparent px-3 text-sm font-medium">
						<span class="size-4" />
						{hidden(column.facet.label)}
					</Skeleton>
				)] : [])}
			</div>
			<Skeleton class="inline-flex h-8 items-center gap-2 self-start px-3 text-sm font-medium sm:self-auto">
				{hidden(t('Columns', 'الأعمدة'))}
				<span class="size-4" />
			</Skeleton>
		</div>
		<Table aria-label={t('Deployments', 'عمليات النشر')}>
			<TableHeader>
				<TableRow>
					<TableHead class="pe-0"><Skeleton class="size-4 rounded-xs" /></TableHead>
					{columns().map(column => (
						<TableHead key={column.label}>
							{column.id === 'actions' ? column.header : (
								<span class="inline-flex items-center gap-2">
									{column.label}
									{column.sort !== false && <span aria-hidden="true" class="size-4" />}
								</span>
							)}
						</TableHead>
					))}
				</TableRow>
			</TableHeader>
			<TableBody>
				{deployments().slice(0, 10).map(row => (
					<TableRow key={row.id}>
						<TableCell class="pe-0"><Skeleton class="size-4 rounded-xs" /></TableCell>
						{[28, 16, 20, 16, 28, 24].map((width, cell) => (
							<TableCell key={cell}><Skeleton style={`width:${width * 4}px`}>&nbsp;</Skeleton></TableCell>
						))}
						<TableCell><Skeleton class="size-8" /></TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
		<div data-screen-footer="" class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<Skeleton class="w-40 text-sm">&nbsp;</Skeleton>
			<div class="flex flex-wrap items-center gap-4">
				<Skeleton class="h-8 w-40" />
				<Skeleton class="w-[100px] text-sm">&nbsp;</Skeleton>
				<Skeleton class="h-8 w-38" />
			</div>
		</div>
	</div>
)

/**
 * The deployments page, loaded or still loading; "Clear filters" mounts a
 * fresh table, which drops its search and facets.
 */
const Deployments: Stateful<{ loading?: boolean; selected?: string[] }> = function* () {
	let generation = 0
	const clear = () => this.next(() => generation++)

	for (const { loading, selected } of this) yield (
		<Page {...header()}>
			{loading ? <LoadingTable /> : (
				<DataTable
					key={generation}
					columns={columns()}
					empty={(
						<Empty>
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<span aria-hidden="true" class="i-lucide-search-x" />
								</EmptyMedia>
								<EmptyTitle>{t('No deployments match', 'لا توجد عمليات نشر مطابقة')}</EmptyTitle>
								<EmptyDescription>{t('Try another version or app, or clear the filters to see every deployment.', 'جرّب إصدارًا أو تطبيقًا آخر، أو امسح عوامل التصفية لترى كل عمليات النشر.')}</EmptyDescription>
							</EmptyHeader>
							<EmptyContent>
								<Button variant="outline" set:onclick={clear}>{t('Clear filters', 'مسح عوامل التصفية')}</Button>
							</EmptyContent>
						</Empty>
					)}
					getRowKey={row => row.id}
					label={t('Deployments', 'عمليات النشر')}
					labels={document.documentElement.dir === 'rtl' ? arabic : undefined}
					pagination={{ defaultSize: 10, sizes: [10, 25, 50] }}
					rows={deployments()}
					search={{ placeholder: t('Search versions and apps', 'ابحث في الإصدارات والتطبيقات') }}
					selection={{ defaultValue: selected, getRowLabel: row => row.id }}
				/>
			)}
		</Page>
	)
}

const search = (canvas: HTMLElement, value: string) => {
	const input = canvas.querySelector<HTMLInputElement>('input[data-slot="data-table-search"]')
	if (!input) throw new Error('The deployments table has no search')
	input.value = value
	input.dispatchEvent(new InputEvent('input', { bubbles: true, data: value }))
}

const rows = (canvas: HTMLElement) => canvas.querySelectorAll('[data-slot="data-table"] tbody tr:has([data-slot="table-cell"][data-column-id="id"])').length

/** Presses `key` where focus is, as a keyboard would. */
const key = (name: string) => {
	const target = document.activeElement
	if (!(target instanceof HTMLElement)) throw new Error(`Nothing has focus to press ${name} on`)
	press(target, name)
}

/** Waits until focus sits on an element that matches `selector`. */
const focused = (selector: string, message: string) => until(() => !!document.activeElement?.matches(selector), message)

export default {
	title: 'Screens/Table',
	parameters: {
		docs: { description: 'Deployments: one bar height, search, facets, column visibility, row selection and actions, pagination, and an empty result that offers the next action.' },
		layout: 'fullscreen',
	},
} satisfies Meta

export const Default: Story = {
	render: () => <Deployments selected={['v89-9d4a7b6', 'v311-b52f8a3']} />,
	parameters: {
		known: [
			{ check: 'focus', slice: 'p5-kit-12', variants: ['light-1280', 'rtl-light-1280', 'light-390'], targets: ['input[data-slot=checkbox-input]'] },
			{ check: 'focus', slice: 'p5-kit-17', variants: ['light-1280', 'rtl-light-1280', 'light-390'], targets: ['button[data-slot=data-table-pagination-action]'] },
			{ check: 'forced-colors', slice: 'p5-kit-12', variants: ['light-1280'], targets: ['input[data-slot=checkbox-input]'] },
			{ check: 'forced-colors', slice: 'p5-kit-17', variants: ['light-1280'], targets: ['button[data-slot=data-table-pagination-action]', 'input[data-slot=data-table-search]'] },
		],
		layers: {
			'row-actions': '[data-screen-layer="row-actions"]',
			filter: '[data-slot="data-table-facet"]',
			columns: '[data-slot="data-table-columns"]',
		},
	},
}

export const Filtered: Story = {
	parameters: {
		known: [
			{ check: 'focus', slice: 'p5-kit-17', variants: ['light-1280', 'rtl-light-1280', 'light-390'], targets: ['button[data-slot=data-table-facet]'] },
			{ check: 'forced-colors', slice: 'p5-kit-12', variants: ['light-1280'], targets: ['input[data-slot=checkbox-input]'] },
			{ check: 'forced-colors', slice: 'p5-kit-17', variants: ['light-1280'], targets: ['button[data-slot=data-table-facet]', 'input[data-slot=data-table-search]'] },
		],
	},
	render: () => <Deployments />,
	// The table's task by keyboard: search, filter by status from its menu, then open a row's actions.
	play: async ({ canvas }) => {
		search(canvas, 'shop')
		await until(() => rows(canvas) === 4, 'Searching "shop" did not leave four deployments')

		const status = [...canvas.querySelectorAll<HTMLButtonElement>('[data-slot="data-table-facet"]')][1]
		if (!status) throw new Error('The table has no status filter')
		status.focus()
		key('Enter')
		await focused(`[data-slot="menu-checkbox-item"][data-label="${statuses().live.label}"]`, 'Enter on the status filter did not focus Live')
		key('Enter')
		await until(() => rows(canvas) === 2, 'Enter on Live did not leave two deployments')
		key('Escape')
		await until(() => status.getAttribute('aria-expanded') !== 'true', 'Escape did not close the status filter')
		if (document.activeElement !== status) throw new Error('Closing the status filter did not return focus to it')

		const actions = canvas.querySelector<HTMLButtonElement>('[data-screen-layer="row-actions"]')
		if (!actions) throw new Error('The first row has no actions')
		actions.focus()
		key('Enter')
		await focused('[data-slot="menu-item"]', 'Enter on the row actions did not focus its first item')
		const first = document.activeElement
		key('ArrowDown')
		await until(() => document.activeElement !== first, 'ArrowDown did not move through the row actions')
		key('Escape')
		await until(() => actions.getAttribute('aria-expanded') !== 'true', 'Escape did not close the row actions')
		if (document.activeElement !== actions) throw new Error('Closing the row actions did not return focus to them')
		actions.blur()

		// Focus scrolled a narrow table to the row actions; the capture shows it from its start (0 in either direction).
		const container = actions.closest<HTMLElement>('[data-slot="data-table-container"]')
		if (!container) throw new Error('The row actions sit outside the table container')
		container.scrollLeft = 0
		await frame(2)
		const edge = container.getBoundingClientRect()
		const cell = canvas.querySelector('tbody td')?.getBoundingClientRect()
		if (!cell || cell.left < edge.left || cell.right > edge.right) throw new Error('The filtered table does not rest at its start')
	},
}

const geometry = (canvas: HTMLElement) => new Map([
	...boxes(canvas.querySelectorAll('table tr'), 'table row'),
	...boxes(canvas.querySelectorAll('[data-screen-footer], [data-slot="data-table-footer"]'), 'footer'),
])

export const Loading: Story = {
	args: { loading: true },
	parameters: {
		known: [
			{ check: 'axe', slice: 'p5-kit-17', variants: ['light-390', 'dark-390'], targets: ['scrollable-region-focusable'] },
			{ check: 'focus', slice: 'p5-kit-17', variants: ['light-390', 'dark-390'], targets: ['div[data-slot=table-container]'] },
		],
	},
	render: args => <Deployments loading={args.loading} />,
	play: async ({ canvas, setArg }) => {
		// The skeleton holds the loaded table's rows and footer, so nothing jumps when data arrives.
		const skeleton = geometry(canvas)
		try {
			setArg('loading', false)
			await until(() => rows(canvas) === 10, 'The loaded table did not show ten deployments')
			await frame(2)
			assertHeld(skeleton, geometry(canvas))
		} finally {
			setArg('loading', true)
		}
	},
}

export const NoResults: Story = {
	parameters: {
		known: [
			{ check: 'forced-colors', slice: 'p5-kit-17', variants: ['light-1280'], targets: ['input[data-slot=data-table-search]'] },
		],
	},
	render: () => <Deployments />,
	play: async ({ canvas }) => {
		search(canvas, 'v400')
		await until(() => !!canvas.querySelector('[data-slot="data-table-empty"]'), 'Searching "v400" did not empty the table')
		;(document.activeElement as HTMLElement | null)?.blur()
	},
}
