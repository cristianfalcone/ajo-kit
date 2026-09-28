/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Args, Meta, Story } from '../app'
import { assertStill, frame, until } from '../play'
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
import { Chip } from 'ajo-ui-playa/chip'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from 'ajo-ui-playa/dialog'
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from 'ajo-ui-playa/drawer'
import { Field, FieldDescription, FieldError, FieldLabel } from 'ajo-ui-playa/field'
import { Input } from 'ajo-ui-playa/input'
import { Spinner } from 'ajo-ui-playa/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'ajo-ui-playa/table'
import { Page, t } from './page'

type Domain = { name: string; state: 'serving' | 'waiting'; detail: string }

const domains = (): Domain[] => [
	{ name: 'shop.example.com', state: 'serving', detail: t('Certificate renews on November 12', 'تتجدد الشهادة في 12 نوفمبر') },
	{ name: 'www.shop.example.com', state: 'serving', detail: t('Redirects to shop.example.com', 'يعيد التوجيه إلى shop.example.com') },
	{ name: 'api.shop.example.com', state: 'waiting', detail: t('Waiting for its DNS record', 'في انتظار سجل DNS الخاص به') },
]

/**
 * The "Add domain" form, shared by the dialog and the phone's drawer. Adding
 * waits on the host, which answers with the DNS error; `error` starts there.
 * The form is the host itself, laid out as `contents`, so the header, field
 * and footer take the dialog's grid gap and the drawer's column.
 */
const AddDomain: Stateful<{ error: boolean; layout: 'dialog' | 'drawer' }, 'form'> = function* () {
	let pending = false
	let answered = false
	this.addEventListener('submit', event => {
		event.preventDefault()
		this.next(() => pending = true)
		const answer = setTimeout(() => this.next(() => {
			pending = false
			answered = true
		}), 600)
		this.signal.addEventListener('abort', () => clearTimeout(answer), { once: true })
	}, { signal: this.signal })

	for (const { error, layout } of this) {
		const failed = error || answered
		const [Header, Title, Description, Footer] = layout === 'dialog'
			? [DialogHeader, DialogTitle, DialogDescription, DialogFooter]
			: [DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter]
		yield (
			<>
				<Header>
					<Title>{t('Add domain', 'إضافة نطاق')}</Title>
					<Description>{t('Visitors reach shop-api at this address once its DNS points here.', 'يصل الزوار إلى shop-api عبر هذا العنوان بعد أن يشير DNS الخاص به إلى هنا.')}</Description>
				</Header>
				<Field invalid={failed} name={`add-domain-${layout}`} class={layout === 'drawer' ? 'px-4' : undefined}>
					<FieldLabel>{t('Domain', 'النطاق')}</FieldLabel>
					<Input dir="ltr" name="domain" value="shop.example.org" readOnly={pending} />
					<FieldDescription>{t('Point its A record to 203.0.113.24 first.', 'وجّه سجل A الخاص به إلى 203.0.113.24 أولًا.')}</FieldDescription>
					{/* The host's answer fits one line, like the help it replaces. */}
					{failed && <FieldError>{t('Its A record does not point to 203.0.113.24 yet.', 'سجل A الخاص به لا يشير إلى 203.0.113.24 بعد.')}</FieldError>}
				</Field>
				<Footer>
					<DialogClose class={buttonVariants({ variant: 'secondary' })}>{t('Cancel', 'إلغاء')}</DialogClose>
					{/* Composed by hand until Button takes `loading` (p5-kit-10). */}
					<Button type="submit" aria-busy={pending ? 'true' : undefined} aria-disabled={pending ? 'true' : undefined}>
						{pending && <Spinner />}
						{t('Add domain', 'إضافة نطاق')}
					</Button>
				</Footer>
			</>
		)
	}
}

AddDomain.is = 'form'
AddDomain.attrs = { class: 'contents' }

const Remove = ({ domain }: { domain: string }) => (
	<AlertDialog>
		<AlertDialogTrigger class={buttonVariants({ variant: 'ghost', size: 'sm' })} data-screen-layer="remove-domain">
			{t('Remove', 'إزالة')}
			<span class="sr-only"><bdi>{domain}</bdi></span>
		</AlertDialogTrigger>
		{/* The dialog renders inside its table cell, whose text does not wrap. */}
		<AlertDialogContent class="whitespace-normal">
			<AlertDialogHeader>
				<AlertDialogTitle>{t('Remove', 'إزالة')} <bdi>{domain}</bdi>{t('?', '؟')}</AlertDialogTitle>
				<AlertDialogDescription>{t('Visitors to this address stop reaching shop-api, and its certificate is revoked.', 'يتوقف وصول زوار هذا العنوان إلى shop-api، وتُلغى شهادته.')}</AlertDialogDescription>
			</AlertDialogHeader>
			<AlertDialogFooter>
				<AlertDialogCancel>{t('Cancel', 'إلغاء')}</AlertDialogCancel>
				<AlertDialogAction variant="danger">{t('Remove domain', 'إزالة النطاق')}</AlertDialogAction>
			</AlertDialogFooter>
		</AlertDialogContent>
	</AlertDialog>
)

const State = ({ class: classes, state }: { class?: string; state: Domain['state'] }) => state === 'serving'
	? <Chip variant="success" class={classes}>{t('Serving', 'يعمل')}</Chip>
	: <Chip variant="secondary" class={classes}>{t('Waiting for DNS', 'في انتظار DNS')}</Chip>

const Domains = ({ error }: Args) => (
	<Page
		title={t('Domains', 'النطاقات')}
		lead={t('Addresses that reach shop-api.', 'العناوين التي تصل إلى shop-api.')}
		action={(
			<div>
				<Dialog>
					<DialogTrigger class={buttonVariants({ class: 'max-sm:hidden' })} data-screen-layer="add-domain">
						<span aria-hidden="true" class="i-lucide-plus" />
						{t('Add domain', 'إضافة نطاق')}
					</DialogTrigger>
					<DialogContent>
						<AddDomain error={error} layout="dialog" />
					</DialogContent>
				</Dialog>
				<Drawer side="bottom">
					<DialogTrigger class={buttonVariants({ class: 'sm:hidden' })} data-screen-layer="add-domain">
						<span aria-hidden="true" class="i-lucide-plus" />
						{t('Add domain', 'إضافة نطاق')}
					</DialogTrigger>
					<DrawerContent>
						<AddDomain error={error} layout="drawer" />
					</DrawerContent>
				</Drawer>
			</div>
		)}
	>
		<Table aria-label={t('Domains', 'النطاقات')}>
			<TableHeader>
				<TableRow>
					<TableHead>{t('Domain', 'النطاق')}</TableHead>
					<TableHead class="max-sm:hidden">{t('State', 'الحالة')}</TableHead>
					<TableHead><span class="sr-only">{t('Actions', 'الإجراءات')}</span></TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{domains().map(domain => (
					<TableRow key={domain.name}>
						{/* On a phone the state goes under the name and the text wraps, so Remove stays in view;
						   the actions cell drops its start padding (Remove's own keeps the gap), so the detail
						   has the room for its one line. */}
						<TableCell class="max-sm:py-2 max-sm:whitespace-normal max-sm:text-pretty">
							{/* items-start keeps the Latin name at the cell's start in either direction. */}
							<div class="flex flex-col items-start">
								<bdi class="font-medium">{domain.name}</bdi>
								<span class="text-muted-foreground">{domain.detail}</span>
								<State state={domain.state} class="mt-1 sm:hidden" />
							</div>
						</TableCell>
						<TableCell class="max-sm:hidden">
							<State state={domain.state} />
						</TableCell>
						<TableCell class="text-end max-sm:ps-0">
							<Remove domain={domain.name} />
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	</Page>
)

const visible = (canvas: HTMLElement, selector: string) =>
	[...canvas.querySelectorAll<HTMLElement>(selector)].find(element => element.checkVisibility())

export default {
	title: 'Screens/Dialog',
	args: { error: false },
	argTypes: { error: { control: 'boolean', description: 'The host already answered the submit with its DNS error.' } },
	parameters: {
		docs: { description: 'Add domain in a dialog (a drawer on a phone) with a server error and an async submit, and Remove domain in an alert dialog: scrim, panel, button order, focus in and back.' },
		layers: {
			'add-domain': '[data-screen-layer="add-domain"]',
			'remove-domain': '[data-screen-layer="remove-domain"]',
		},
		layout: 'fullscreen',
	},
	render: args => <Domains {...args} />,
} satisfies Meta

export const Default: Story = {
	// Enter on the trigger and Escape in the dialog are native, which a play's untrusted keys
	// cannot do: it clicks the trigger and fires the cancel event Escape fires (README, Keyboard).
	play: async ({ canvas, setArg }) => {
		// Remove, the task of the screen, stays in the table's view at every width.
		const view = canvas.querySelector('[data-slot="table-container"]')?.getBoundingClientRect()
		if (!view) throw new Error('The domains have no table')
		for (const remove of canvas.querySelectorAll('[data-screen-layer="remove-domain"]')) {
			const box = remove.getBoundingClientRect()
			if (box.left < view.left || box.right > view.right) throw new Error(`Remove sits outside the table's view: ${box.left}..${box.right} in ${view.left}..${view.right}`)
		}

		const trigger = visible(canvas, '[data-screen-layer="add-domain"]')
		const dialog = trigger?.parentElement?.querySelector<HTMLDialogElement>('dialog')
		if (!trigger || !dialog) throw new Error('Add domain has no visible trigger and dialog')
		trigger.click()
		await until(() => dialog.open, 'Add domain did not open')
		await frame(2)
		if (!dialog.contains(document.activeElement)) throw new Error('Opening Add domain did not move focus into it')
		try {
			// The host's error lands in the open dialog: nothing in it may move.
			await assertStill(dialog, () => setArg('error', true))
		} finally {
			setArg('error', false)
			dialog.dispatchEvent(new Event('cancel', { cancelable: true }))
			await until(() => !dialog.open, 'Add domain did not close')
		}
		if (document.activeElement !== trigger) throw new Error('Closing Add domain did not return focus to its trigger')
		trigger.blur()
	},
}

export const ServerError: Story = {
	args: { error: true },
	parameters: {
		layers: { 'add-domain': '[data-screen-layer="add-domain"]' },
	},
}
