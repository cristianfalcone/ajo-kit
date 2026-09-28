/** @jsxImportSource ajo */
import type { Known, Meta, Story } from '../app'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from 'ajo-ui-playa/alert-dialog'
import { Button, buttonVariants } from 'ajo-ui-playa/button'
import { Checkbox } from 'ajo-ui-playa/checkbox'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldRow, FieldSet } from 'ajo-ui-playa/field'
import { Input } from 'ajo-ui-playa/input'
import { RadioGroup, RadioGroupItem } from 'ajo-ui-playa/radio-group'
import { Select, SelectContent, SelectItem, SelectList, SelectTrigger, SelectValue } from 'ajo-ui-playa/select'
import { Switch } from 'ajo-ui-playa/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'ajo-ui-playa/tabs'
import { Page, Section, t } from './page'

/** What fills an "on" choice control: `ink` (the text colour, navy by day and ivory at night) is the chosen fill; `plate` puts the gold plate on each, kept to compare. */
type Gold = 'ink' | 'plate'

// Both keep the switch thumb one colour, the raised surface with the input
// boundary, and let the track carry the state; they differ only in what fills
// an "on" control. The families draw neither yet, so the screen paints them
// here from the tokens; p5-kit-12 draws the chosen ink fill and this thumb, and
// the plate stays only as the comparison.
const on = (gold: Gold) => `[data-gold=${gold}] :is([data-slot=switch]:has(:checked),.playa-checkbox-box:has(:checked),[data-slot=radio-group-item]:has(:checked))`
const d28 = [
	'[data-gold] [data-slot=switch]>[data-slot=switch-thumb][aria-hidden]{background:var(--secondary);box-shadow:0 0 0 1px var(--input),var(--shadow-xs)}',
	`${on('plate')}{background-color:var(--primary);background-image:var(--brush),var(--gilt-plate);background-blend-mode:soft-light,normal;color:var(--primary-foreground)}`,
	// The plate's edge and shadow take the box-shadow the focus ring also draws with, so they rest only while unfocused.
	`${on('plate')}:not(:has(:focus-visible)){box-shadow:var(--gilt-plate-edge),var(--gilt-plate-shadow)}`,
	`${on('ink')}{background:var(--foreground);color:var(--background)}`,
].join('')

const notices = (): [string, string, string, boolean][] => [
	['deploy-finished', t('Deploy finished', 'اكتمل النشر'), t('When a new version starts serving.', 'عندما يبدأ إصدار جديد في الخدمة.'), true],
	['deploy-failed', t('Deploy failed', 'فشل النشر'), t('With the step that failed and its log.', 'مع الخطوة التي فشلت وسجلها.'), true],
	['certificate', t('Certificate expiring', 'شهادة على وشك الانتهاء'), t('Two weeks before a domain certificate ends.', 'قبل أسبوعين من انتهاء شهادة نطاق.'), true],
	['disk', t('Disk almost full', 'القرص ممتلئ تقريبًا'), t('When the host has less than 10% free.', 'عندما تقل المساحة الحرة على المضيف عن 10%.'), true],
	['sign-in', t('New sign-in', 'تسجيل دخول جديد'), t('When someone signs in on a new device.', 'عندما يسجّل أحد الدخول من جهاز جديد.'), true],
	['invitation', t('Invitation accepted', 'قُبلت الدعوة'), t('When someone you invited joins the host.', 'عندما ينضم شخص دعوته إلى المضيف.'), false],
	['summary', t('Weekly summary', 'ملخص أسبوعي'), t('Deploys, traffic and errors, every Monday.', 'عمليات النشر والزيارات والأخطاء، كل يوم اثنين.'), false],
	['news', t('Product news', 'أخبار المنتج'), t('Releases of Ajo and the host image.', 'إصدارات Ajo وصورة المضيف.'), false],
]

const sessions = (): [string, string, string, boolean][] => [
	[t('Firefox on Linux', 'Firefox على Linux'), t('This device', 'هذا الجهاز'), '203.0.113.24', true],
	[t('Safari on iPhone', 'Safari على iPhone'), t('Active 2 hours ago', 'نشط منذ ساعتين'), '198.51.100.7', false],
	[t('Chrome on macOS', 'Chrome على macOS'), t('Active on September 21', 'نشط في 21 سبتمبر'), '192.0.2.140', false],
]

const themes = (): [string, string][] => [['system', t('Same as the system', 'مثل النظام')], ['light', t('Light', 'فاتح')], ['dark', t('Dark', 'داكن')]]

const General = () => (
	<div class="flex flex-col gap-8">
		<Section title={t('Profile', 'الملف الشخصي')} lead={t('Shown to the people you invite.', 'يظهر لمن تدعوهم.')}>
			<form class="flex flex-col gap-6" set:onsubmit={(event: Event) => event.preventDefault()}>
				<FieldGroup>
					<FieldRow>
						<Field name="profile-name">
							<FieldLabel>{t('Name', 'الاسم')}</FieldLabel>
							<Input name="name" value={t('Ada Lovelace', 'آدا لوفليس')} autocomplete="name" />
						</Field>
						<Field name="profile-email">
							<FieldLabel>{t('Email', 'البريد الإلكتروني')}</FieldLabel>
							<Input dir="ltr" name="email" type="email" value="ada@example.com" autocomplete="email" />
							<FieldDescription>{t('Sign-in links and notices go here.', 'تصل إليه روابط تسجيل الدخول والإشعارات.')}</FieldDescription>
						</Field>
					</FieldRow>
					{/* The time zone keeps the width of the name above it. */}
					<Field class="@md/field-group:max-w-[calc(50%-0.75rem)]" name="profile-zone">
						<FieldLabel for="profile-zone">{t('Time zone', 'المنطقة الزمنية')}</FieldLabel>
						<Select defaultValue="europe-lisbon" name="zone">
							<SelectTrigger id="profile-zone" class="w-full">
								<SelectValue placeholder={t('Choose a time zone', 'اختر منطقة زمنية')} />
							</SelectTrigger>
							<SelectContent>
								<SelectList>
									<SelectItem value="europe-lisbon">{t('Lisbon (UTC+0)', 'لشبونة (UTC+0)')}</SelectItem>
									<SelectItem value="america-montevideo">{t('Montevideo (UTC-3)', 'مونتيفيديو (UTC-3)')}</SelectItem>
									<SelectItem value="asia-tokyo">{t('Tokyo (UTC+9)', 'طوكيو (UTC+9)')}</SelectItem>
								</SelectList>
							</SelectContent>
						</Select>
					</Field>
					<Field orientation="horizontal" name="profile-directory">
						<Checkbox id="profile-directory" name="directory" defaultChecked />
						<FieldLabel for="profile-directory">{t('Show my email to the people I invite', 'أظهر بريدي الإلكتروني لمن أدعوهم')}</FieldLabel>
					</Field>
				</FieldGroup>
				<div class="flex justify-end">
					<Button type="submit">{t('Save changes', 'حفظ التغييرات')}</Button>
				</div>
			</form>
		</Section>

		<Section title={t('Appearance', 'المظهر')}>
			<FieldSet>
				<FieldLegend variant="label">{t('Theme', 'السمة')}</FieldLegend>
				<RadioGroup name="theme" defaultValue="system" orientation="horizontal">
					{themes().map(([value, label]) => (
						<div key={value} class="flex items-center gap-2">
							<RadioGroupItem id={`theme-${value}`} value={value} />
							<FieldLabel for={`theme-${value}`}>{label}</FieldLabel>
						</div>
					))}
				</RadioGroup>
			</FieldSet>
		</Section>

		<Section title={t('Notifications', 'الإشعارات')} lead={t('Sent by email as they happen. Changes apply at once.', 'تُرسل بالبريد الإلكتروني فور حدوثها. تُطبَّق التغييرات فورًا.')}>
			<div class="grid gap-x-8 gap-y-5 md:grid-cols-2">
				{notices().map(([id, label, description, checked]) => (
					<Field key={id} orientation="horizontal" name={`notice-${id}`}>
						<FieldContent>
							<FieldLabel for={`notice-${id}`}>{label}</FieldLabel>
							<FieldDescription>{description}</FieldDescription>
						</FieldContent>
						<Switch id={`notice-${id}`} name={id} defaultChecked={checked} />
					</Field>
				))}
			</div>
		</Section>

		<Section title={t('Sessions', 'الجلسات')} lead={t('Devices signed in to your account.', 'الأجهزة المسجّل دخولها إلى حسابك.')}>
			<ul class="flex flex-col gap-4">
				{sessions().map(([device, activity, address, current]) => (
					<li key={address} class="flex items-center justify-between gap-4">
						<div class="flex min-w-0 flex-col">
							<span class="text-sm font-medium">{device}</span>
							<span class="text-sm text-muted-foreground">
								{activity} {t('from', 'من')} <bdi class="font-mono">{address}</bdi>
							</span>
						</div>
						{current
							? <span class="shrink-0 text-sm text-muted-foreground">{t('Current session', 'الجلسة الحالية')}</span>
							: <Button class="shrink-0" variant="outline" size="sm">{t('Sign out', 'تسجيل الخروج')}</Button>}
					</li>
				))}
			</ul>
		</Section>

		<Section title={t('Delete this host', 'حذف هذا المضيف')} lead={t('Deletes every app, domain and secret on this host. It cannot be undone.', 'يحذف كل التطبيقات والنطاقات والأسرار على هذا المضيف. لا يمكن التراجع عن ذلك.')}>
			<div>
				<AlertDialog>
					<AlertDialogTrigger class={buttonVariants({ variant: 'danger-ghost', class: 'edge' })} data-screen-layer="delete-host">
						{t('Delete host', 'حذف المضيف')}
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>{t('Delete this host?', 'حذف هذا المضيف؟')}</AlertDialogTitle>
							<AlertDialogDescription>{t('Its 6 apps, 6 domains and 12 secrets are deleted with it.', 'تُحذف معه 6 تطبيقات و6 نطاقات و12 سرًا.')}</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>{t('Cancel', 'إلغاء')}</AlertDialogCancel>
							<AlertDialogAction variant="danger">{t('Delete host', 'حذف المضيف')}</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</Section>
	</div>
)

const Settings = ({ gold }: { gold: Gold }) => (
	<Page title={t('Settings', 'الإعدادات')} lead={t('Your account and how this host reaches you.', 'حسابك وكيف يتواصل معك هذا المضيف.')}>
		<style>{d28}</style>
		<Tabs defaultValue="general" class="flex max-w-[48rem] flex-col gap-8" data-gold={gold}>
			<TabsList>
				<TabsTrigger value="general">{t('General', 'عام')}</TabsTrigger>
				<TabsTrigger value="tokens">{t('Access tokens', 'رموز الوصول')}</TabsTrigger>
			</TabsList>
			<TabsContent value="general">
				<General />
			</TabsContent>
			<TabsContent value="tokens">
				<Section title={t('Access tokens', 'رموز الوصول')} lead={t('Tokens let scripts deploy to this host as you.', 'تتيح الرموز للنصوص البرمجية النشر على هذا المضيف باسمك.')}>
					<div>
						<Button variant="outline">{t('Create token', 'إنشاء رمز')}</Button>
					</div>
				</Section>
			</TabsContent>
		</Tabs>
	</Page>
)

export default {
	title: 'Screens/Settings',
	args: { gold: 'ink' },
	argTypes: {
		gold: { control: 'select', options: ['ink', 'plate'], description: 'What fills an "on" control: ink (the chosen fill) or the gold plate on each, to compare.' },
	},
	parameters: {
		docs: { description: 'Account and host settings: section rhythm, gold kept scarce on a page of switches, horizontal fields at control height, a destructive action that does not flood the page red.' },
		layers: {
			'delete-host': '[data-screen-layer="delete-host"]',
		},
		layout: 'fullscreen',
	},
	render: args => <Settings gold={args.gold as Gold} />,
} satisfies Meta

// Ink and Plate share every known failure.
const known: Known[] = [
	{ check: 'focus', slice: 'p5-kit-18', variants: ['light-1280', 'rtl-light-1280', 'light-390'], targets: ['button[data-slot=tabs-trigger]'] },
	{ check: 'focus', slice: 'p5-kit-18', variants: ['light-1280', 'dark-1280', 'rtl-light-1280', 'light-390', 'dark-390'], targets: ['div[data-slot=tabs-content]'] },
	{ check: 'forced-colors', slice: 'p5-kit-18', variants: ['light-1280'], targets: ['button[data-slot=tabs-trigger]', 'div[data-slot=tabs-content]'] },
]

export const Ink: Story = {
	parameters: { known },
}

// The same page with the plate on every "on" control, to compare with ink; its layers show nothing new.
export const Plate: Story = {
	args: { gold: 'plate' },
	parameters: {
		known,
		layers: {},
	},
}
