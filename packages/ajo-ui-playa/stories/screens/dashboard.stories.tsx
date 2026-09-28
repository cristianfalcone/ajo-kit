/** @jsxImportSource ajo */
import type { Meta, Story } from '../app'
import { Alert, AlertAction, AlertDescription, AlertTitle } from 'ajo-ui-playa/alert'
import { Button } from 'ajo-ui-playa/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'ajo-ui-playa/card'
import { ChartArea, ChartContainer, ChartLegend, ChartTooltip, ChartTooltipContent, type ChartConfig } from 'ajo-ui-playa/chart'
import { Chip } from 'ajo-ui-playa/chip'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from 'ajo-ui-playa/item'
import { Page, Section, t } from './page'

type Metric = { label: string; value: string; trend: string; state: string; tone: 'secondary' | 'success' | 'warning' }

const metrics = (): Metric[] => [
	{ label: t('CPU', 'المعالج'), value: '38%', trend: t('Down 4 points in the last hour', 'انخفض 4 نقاط في الساعة الأخيرة'), state: t('Normal', 'طبيعي'), tone: 'success' },
	{ label: t('Memory', 'الذاكرة'), value: t('6.1 of 8 GB', '6.1 من 8 غيغابايت'), trend: t('Up 0.4 GB since the last deploy', 'زاد 0.4 غيغابايت منذ آخر نشر'), state: t('Normal', 'طبيعي'), tone: 'success' },
	{ label: t('Disk', 'القرص'), value: t('72 of 80 GB', '72 من 80 غيغابايت'), trend: t('Up 3 GB this week', 'زاد 3 غيغابايت هذا الأسبوع'), state: t('Almost full', 'ممتلئ تقريبًا'), tone: 'warning' },
	{ label: t('Apps running', 'التطبيقات العاملة'), value: t('5 of 6', '5 من 6'), trend: t('mailer stopped 2 hours ago', 'توقف mailer منذ ساعتين'), state: t('One stopped', 'واحد متوقف'), tone: 'secondary' },
]

// Requests per hour for the two busiest apps, the last twelve hours.
const traffic = [
	{ hour: '03:00', api: 820, web: 610 },
	{ hour: '04:00', api: 760, web: 540 },
	{ hour: '05:00', api: 790, web: 580 },
	{ hour: '06:00', api: 1040, web: 720 },
	{ hour: '07:00', api: 1480, web: 1010 },
	{ hour: '08:00', api: 1920, web: 1380 },
	{ hour: '09:00', api: 2260, web: 1640 },
	{ hour: '10:00', api: 2410, web: 1720 },
	{ hour: '11:00', api: 2330, web: 1690 },
	{ hour: '12:00', api: 2180, web: 1570 },
	{ hour: '13:00', api: 2290, web: 1610 },
	{ hour: '14:00', api: 2370, web: 1660 },
]

const chart = () => ({
	api: { label: 'shop-api', color: 'var(--chart-1)' },
	web: { label: 'shop-web', color: 'var(--chart-2)' },
}) satisfies ChartConfig

const deploys = (): [string, string, string][] => [
	['shop-api', 'v142-7f3c9a1', t('4 minutes ago by Ada Lovelace', 'منذ 4 دقائق بواسطة آدا لوفليس')],
	['shop-web', 'v88-c01f5e2', t('1 hour ago by Grace Hopper', 'منذ ساعة بواسطة غريس هوبر')],
	['billing', 'v310-0c7e4d1', t('6 hours ago by Ada Lovelace', 'منذ 6 ساعات بواسطة آدا لوفليس')],
	['search', 'v54-7a1d9e6', t('2 days ago by Alan Turing', 'منذ يومين بواسطة آلان تورينغ')],
]

// Log lines are data: they stay Latin and left to right in every page direction.
const log = [
	'14:31:58 shop-api  GET /orders/8812 200 41ms',
	'14:31:59 shop-web  GET /checkout 200 112ms',
	'14:32:01 shop-api  POST /orders 201 87ms',
	'14:32:02 billing   charge ch_3P1x settled',
	'14:32:04 shop-api  GET /orders/8813 404 9ms',
	'14:32:05 mailer    exited with code 1 (SMTP connection refused)',
]

const Dashboard = () => (
	<Page title={t('Host health', 'صحة المضيف')} lead={t('host-01, as of 14:32. Numbers refresh every minute.', 'host-01، حتى الساعة 14:32. تتحدث الأرقام كل دقيقة.')}>
		<Alert variant="warning">
			<span data-slot="alert-icon" aria-hidden="true" class="i-lucide-triangle-alert" />
			<AlertTitle>{t('The disk is 90% full', 'القرص ممتلئ بنسبة 90%')}</AlertTitle>
			<AlertDescription>{t('Deploys stop at 95%. Remove old versions or grow the volume.', 'يتوقف النشر عند 95%. أزل الإصدارات القديمة أو وسّع وحدة التخزين.')}</AlertDescription>
			<AlertAction>
				<Button variant="outline" size="sm">{t('Review versions', 'مراجعة الإصدارات')}</Button>
			</AlertAction>
		</Alert>

		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{metrics().map(metric => (
				<Card key={metric.label} size="sm">
					<CardHeader>
						<CardDescription>{metric.label}</CardDescription>
						<CardTitle class="text-2xl tabular-nums">{metric.value}</CardTitle>
					</CardHeader>
					<CardContent class="flex flex-col items-start gap-2">
						<Chip variant={metric.tone}>{metric.state}</Chip>
						<span class="text-muted-foreground">{metric.trend}</span>
					</CardContent>
				</Card>
			))}
		</div>

		<div class="grid gap-8 lg:grid-cols-[2fr_1fr]">
			<Section title={t('Requests per hour', 'الطلبات في الساعة')}>
				<ChartContainer
					config={chart()}
					data={traffic}
					xKey="hour"
					series={['api', 'web']}
					type="area"
					label={t('Requests per hour for shop-api and shop-web', 'الطلبات في الساعة لـ shop-api و shop-web')}
					class="h-64"
				>
					<ChartArea />
					<ChartTooltip><ChartTooltipContent /></ChartTooltip>
					<ChartLegend />
				</ChartContainer>
			</Section>
			<Section title={t('Recent deploys', 'آخر عمليات النشر')}>
				<ItemGroup>
					{deploys().map(([app, version, when]) => (
						<Item key={version} size="sm" variant="outline">
							<ItemContent>
								<ItemTitle><bdi>{app}</bdi> <bdi class="font-mono font-normal text-muted-foreground">{version}</bdi></ItemTitle>
								<ItemDescription>{when}</ItemDescription>
							</ItemContent>
						</Item>
					))}
				</ItemGroup>
			</Section>
		</div>

		<Section title={t('Latest log lines', 'أحدث أسطر السجل')}>
			<pre dir="ltr" tabindex={0} aria-label={t('Latest log lines', 'أحدث أسطر السجل')} class="navy overflow-x-auto rounded-lg p-4 font-mono text-xs leading-5">
				{log.join('\n')}
			</pre>
		</Section>
	</Page>
)

export default {
	title: 'Screens/Dashboard',
	parameters: {
		docs: { description: 'Host health: metric panels with value, trend and state, a requests chart from the chart tokens, recent deploys, one warning and a navy log tail.' },
		layout: 'fullscreen',
	},
	render: () => <Dashboard />,
} satisfies Meta

export const Default: Story = {
	parameters: {
		known: [
			{ check: 'axe', slice: 'p5-kit-16', variants: ['light-1280', 'dark-1280', 'rtl-light-1280', 'light-390', 'dark-390'], targets: ['aria-required-children'] },
			{ check: 'axe', slice: 'p5-kit-16', variants: ['light-1280', 'light-390'], targets: ['color-contrast'] },
			{ check: 'axe', slice: 'p5-kit-17', variants: ['light-1280', 'dark-1280', 'rtl-light-1280', 'light-390', 'dark-390'], targets: ['aria-prohibited-attr'] },
			{ check: 'focus', slice: 'p5-kit-17', variants: ['light-1280', 'dark-1280', 'rtl-light-1280', 'light-390', 'dark-390'], targets: ['circle "'] },
			{ check: 'focus', slice: 'p5-kit-19', variants: ['light-1280', 'rtl-light-1280', 'light-390'], targets: ['pre "'] },
			{ check: 'forced-colors', slice: 'p5-kit-17', variants: ['light-1280'], targets: ['circle "'] },
			{ check: 'target-size', slice: 'p5-kit-17', variants: ['light-1280', 'dark-1280', 'rtl-light-1280', 'light-390', 'dark-390'], targets: ['circle "'] },
		],
	},
}
