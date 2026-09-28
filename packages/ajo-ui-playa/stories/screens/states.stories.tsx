/** @jsxImportSource ajo */
import type { Meta, Story } from '../app'
import { frame } from '../play'
import { Alert, AlertAction, AlertDescription, AlertTitle } from 'ajo-ui-playa/alert'
import { Button } from 'ajo-ui-playa/button'
import { Chip } from 'ajo-ui-playa/chip'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from 'ajo-ui-playa/empty'
import { Input } from 'ajo-ui-playa/input'
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from 'ajo-ui-playa/item'
import { Skeleton } from 'ajo-ui-playa/skeleton'
import { assertHeld, boxes, Page, t } from './page'

type State = 'denied' | 'empty' | 'failed' | 'loaded' | 'loading' | 'unmatched'

const apps = (): [string, string, boolean][] => [
	['shop-api', 'shop.example.com', true],
	['shop-web', 'www.shop.example.com', true],
	['mailer', t('No domain', 'بلا نطاق'), false],
	['docs', 'docs.example.com', true],
	['billing', 'billing.example.com', true],
	['search', 'search.example.com', true],
]

// The loaded list and its skeleton share one row: the same media and chip, and each
// skeleton bar holds an empty line of the text it stands for, so it takes that line's height.
const Loaded = () => (
	<ItemGroup data-screen-list="">
		{apps().map(([name, detail, running]) => (
			<Item key={name} variant="outline">
				<ItemMedia variant="icon"><span aria-hidden="true" class="i-lucide-box" /></ItemMedia>
				<ItemContent>
					<ItemTitle><bdi>{name}</bdi></ItemTitle>
					<ItemDescription><bdi>{detail}</bdi></ItemDescription>
				</ItemContent>
				<ItemActions>
					{running ? <Chip variant="success">{t('Running', 'يعمل')}</Chip> : <Chip variant="secondary">{t('Stopped', 'متوقف')}</Chip>}
				</ItemActions>
			</Item>
		))}
	</ItemGroup>
)

const Skeletons = () => (
	<ItemGroup data-screen-list="" aria-busy="true" aria-label={t('Loading apps', 'جارٍ تحميل التطبيقات')}>
		{apps().map(([name]) => (
			<Item key={name} variant="outline">
				<ItemMedia variant="icon"><Skeleton class="size-full" /></ItemMedia>
				<ItemContent>
					<Skeleton class="w-20"><ItemTitle>&nbsp;</ItemTitle></Skeleton>
					<Skeleton class="w-32"><ItemDescription>&nbsp;</ItemDescription></Skeleton>
				</ItemContent>
				<ItemActions><Skeleton class="h-5 w-16 rounded-full" /></ItemActions>
			</Item>
		))}
	</ItemGroup>
)

const Search = ({ value }: { value?: string }) => (
	<div class="flex flex-wrap items-center gap-2">
		<Input class="max-w-xs" type="search" aria-label={t('Search apps', 'ابحث في التطبيقات')} placeholder={t('Search apps', 'ابحث في التطبيقات')} value={value} />
		{value && <Chip variant="outline">{t('Status: Stopped', 'الحالة: متوقف')}</Chip>}
	</div>
)

const content = (state: State) => {
	switch (state) {
		case 'loaded': return <><Search /><Loaded /></>
		case 'loading': return <><Search /><Skeletons /></>
		case 'empty': return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant="icon"><span aria-hidden="true" class="i-lucide-rocket" /></EmptyMedia>
					<EmptyTitle>{t('No apps yet', 'لا توجد تطبيقات بعد')}</EmptyTitle>
					<EmptyDescription>{t('Deploy an app and it shows up here with its versions, domains and logs.', 'انشر تطبيقًا وسيظهر هنا مع إصداراته ونطاقاته وسجلاته.')}</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<Button>{t('Deploy your first app', 'انشر تطبيقك الأول')}</Button>
				</EmptyContent>
			</Empty>
		)
		case 'unmatched': return (
			<>
				<Search value="billing" />
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon"><span aria-hidden="true" class="i-lucide-search-x" /></EmptyMedia>
						<EmptyTitle>{t('No stopped apps match “billing”', 'لا توجد تطبيقات متوقفة تطابق “billing”')}</EmptyTitle>
						<EmptyDescription>{t('billing is running. Clear the filters to see every app.', 'التطبيق billing يعمل. امسح عوامل التصفية لترى كل التطبيقات.')}</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button variant="outline">{t('Clear filters', 'مسح عوامل التصفية')}</Button>
					</EmptyContent>
				</Empty>
			</>
		)
		case 'failed': return (
			<Alert variant="danger">
				<span data-slot="alert-icon" aria-hidden="true" class="i-lucide-octagon-x" />
				<AlertTitle>{t('Apps did not load', 'لم يتم تحميل التطبيقات')}</AlertTitle>
				<AlertDescription>{t('host-01 did not answer within 10 seconds. Check that it is running, then retry.', 'لم يستجب host-01 خلال 10 ثوانٍ. تحقق من أنه يعمل، ثم أعد المحاولة.')}</AlertDescription>
				<AlertAction>
					<Button variant="outline" size="sm">{t('Retry', 'إعادة المحاولة')}</Button>
				</AlertAction>
			</Alert>
		)
		case 'denied': return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant="icon"><span aria-hidden="true" class="i-lucide-lock" /></EmptyMedia>
					<EmptyTitle>{t('Only owners and developers see apps', 'يرى المالكون والمطوّرون فقط التطبيقات')}</EmptyTitle>
					<EmptyDescription>{t('Ask an owner of host-01 to give you the developer role.', 'اطلب من أحد مالكي host-01 منحك دور المطوّر.')}</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<Button variant="outline">{t('Back to overview', 'العودة إلى النظرة العامة')}</Button>
				</EmptyContent>
			</Empty>
		)
	}
}

const Apps = ({ state }: { state: State }) => (
	<Page
		title={t('Apps', 'التطبيقات')}
		lead={t('Everything deployed to host-01.', 'كل ما نُشر على host-01.')}
		action={state === 'loaded' || state === 'loading' || state === 'unmatched' ? <Button>{t('Deploy an app', 'انشر تطبيقًا')}</Button> : undefined}
	>
		{content(state)}
	</Page>
)

export default {
	title: 'Screens/States',
	args: { state: 'empty' },
	argTypes: { state: { control: 'select', options: ['loaded', 'loading', 'empty', 'unmatched', 'failed', 'denied'] } },
	parameters: {
		docs: { description: 'Apps with nothing to show: no apps yet, no match, a failed load, no access and loading, each saying what to do next.' },
		layout: 'fullscreen',
	},
	render: args => <Apps state={args.state as State} />,
} satisfies Meta

export const NoApps: Story = {
}

export const NoResults: Story = {
	args: { state: 'unmatched' },
}

export const Failed: Story = {
	args: { state: 'failed' },
}

export const Denied: Story = {
	args: { state: 'denied' },
}

const rows = (canvas: HTMLElement) => boxes(canvas.querySelectorAll('[data-screen-list] > [data-slot="item"]'), 'div[data-slot=item] row')

export const Loading: Story = {
	args: { state: 'loading' },
	play: async ({ canvas, setArg }) => {
		// The skeleton holds the loaded list's geometry, so nothing jumps when data arrives.
		const skeleton = rows(canvas)
		try {
			setArg('state', 'loaded')
			await frame(2)
			assertHeld(skeleton, rows(canvas))
		} finally {
			setArg('state', 'loading')
		}
	},
}
