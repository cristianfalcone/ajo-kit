/** @jsxImportSource ajo */
import type { Meta, Story } from '../app'
import { assertRowAligned, assertStill, press, until } from '../play'
import { Button } from 'ajo-ui-playa/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from 'ajo-ui-playa/field'
import { Input } from 'ajo-ui-playa/input'
import { InputDate } from 'ajo-ui-playa/input-date'
import { Select, SelectContent, SelectItem, SelectList, SelectTrigger, SelectValue } from 'ajo-ui-playa/select'
import { Spinner } from 'ajo-ui-playa/spinner'
import { Switch } from 'ajo-ui-playa/switch'
import { Textarea } from 'ajo-ui-playa/textarea'
import { Page, t } from './page'

type FormArgs = {
	filled: boolean
	invalid: boolean
	submitting: boolean
	/** Called when the form submits; the story turns it into `submitting`. */
	onSubmit: () => void
}

// An ad hoc row until Playa ships FieldRow: two columns that stack on a phone.
const row = 'grid gap-6 sm:grid-cols-2'

const Choice = ({ id, items, placeholder, value }: { id: string; items: [string, string][]; placeholder: string; value?: string }) => (
	<Select defaultValue={value} name={id}>
		<SelectTrigger id={id} class="w-full">
			<SelectValue placeholder={placeholder} />
		</SelectTrigger>
		<SelectContent>
			<SelectList>
				{items.map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
			</SelectList>
		</SelectContent>
	</Select>
)

const NewApp = ({ filled, invalid, onSubmit, submitting }: FormArgs) => (
	<Page
		title={t('New app', 'تطبيق جديد')}
		lead={t('Name the app and choose where it runs. Everything but the name can change later.', 'سمِّ التطبيق واختر مكان تشغيله. يمكن تغيير كل شيء لاحقًا ما عدا الاسم.')}
	>
		<form
			class="flex w-full max-w-[40rem] flex-col gap-8"
			set:onsubmit={(event: Event) => {
				event.preventDefault()
				onSubmit()
			}}
		>
			<FieldGroup>
				<div data-slot="field-row" class={row}>
					<Field invalid={invalid} name="app-name">
						<FieldLabel>{t('App name', 'اسم التطبيق')}</FieldLabel>
						<Input dir="ltr" name="name" placeholder="shop-api" value={filled ? (invalid ? 'Shop API' : 'shop-api') : undefined} readOnly={submitting} />
						{invalid && <FieldError>{t('Use lowercase letters, numbers and dashes.', 'استخدم أحرفًا لاتينية صغيرة وأرقامًا وشرطات.')}</FieldError>}
					</Field>
					<Field invalid={invalid} name="app-domain">
						<FieldLabel>{t('Domain', 'النطاق')}</FieldLabel>
						<Input dir="ltr" name="domain" placeholder="shop.example.com" value={filled ? 'shop.example.com' : undefined} readOnly={submitting} />
						<FieldDescription>{t('Point its DNS here before the first deploy.', 'وجّه نطاقه إلى هنا قبل أول نشر.')}</FieldDescription>
						{invalid && <FieldError>{t('Another app already uses this domain.', 'تطبيق آخر يستخدم هذا النطاق.')}</FieldError>}
					</Field>
				</div>
				<div data-slot="field-row" class={row}>
					<Field name="app-environment">
						<FieldLabel for="app-environment">{t('Environment', 'البيئة')}</FieldLabel>
						<Choice
							id="app-environment"
							placeholder={t('Choose an environment', 'اختر بيئة')}
							value={filled ? 'production' : undefined}
							items={[['production', t('Production', 'الإنتاج')], ['staging', t('Staging', 'التجهيز')], ['preview', t('Preview', 'المعاينة')]]}
						/>
					</Field>
					<Field name="app-memory">
						<FieldLabel for="app-memory">{t('Memory limit', 'حد الذاكرة')}</FieldLabel>
						<Choice
							id="app-memory"
							placeholder={t('Choose a limit', 'اختر حدًا')}
							value={filled ? '512' : undefined}
							items={[['256', t('256 MB', '256 ميغابايت')], ['512', t('512 MB', '512 ميغابايت')], ['1024', t('1 GB', '1 غيغابايت')], ['2048', t('2 GB', '2 غيغابايت')]]}
						/>
						<FieldDescription>{t('The app restarts if it uses more.', 'يُعاد تشغيل التطبيق إذا تجاوزه.')}</FieldDescription>
					</Field>
				</div>
				<div data-slot="field-row" class={row}>
					<Field name="app-first-deploy">
						<FieldLabel>{t('First deploy', 'أول نشر')}</FieldLabel>
						<InputDate calendar name="first-deploy" defaultValue={filled ? '2026-10-05' : undefined} />
					</Field>
					<Field name="app-boot">
						<FieldLabel for="app-boot">{t('Start on boot', 'التشغيل عند الإقلاع')}</FieldLabel>
						<Switch id="app-boot" name="boot" defaultChecked />
						<FieldDescription>{t('Starts the app again after the host restarts.', 'يشغّل التطبيق من جديد بعد إعادة تشغيل المضيف.')}</FieldDescription>
					</Field>
				</div>
				<Field name="app-description">
					<FieldLabel>{t('Description', 'الوصف')}</FieldLabel>
					<Textarea name="description" placeholder={t('What the app does, for the people you invite.', 'ما يفعله التطبيق، لمن تدعوهم.')} readOnly={submitting} />
				</Field>
			</FieldGroup>
			<div class="flex flex-wrap justify-end gap-3">
				<Button type="button" variant="secondary" aria-disabled={submitting ? 'true' : undefined}>{t('Cancel', 'إلغاء')}</Button>
				{/* Composed by hand until Button takes `loading`. */}
				<Button type="submit" aria-busy={submitting ? 'true' : undefined} aria-disabled={submitting ? 'true' : undefined}>
					{submitting ? <Spinner /> : <span aria-hidden="true" class="i-lucide-plus" />}
					{t('Create app', 'إنشاء التطبيق')}
				</Button>
			</div>
		</form>
	</Page>
)

export default {
	title: 'Screens/Form',
	args: { filled: false, invalid: false, submitting: false },
	argTypes: {
		filled: { control: 'boolean' },
		invalid: { control: 'boolean' },
		submitting: { control: 'boolean' },
	},
	parameters: {
		docs: { description: 'New app: rows with and without help or error, equal control heights across input, select, date and switch, placeholder against value, a busy primary action.' },
		layout: 'fullscreen',
	},
	render: (args, { setArg }) => <NewApp {...args as FormArgs} onSubmit={() => setArg('submitting', true)} />,
} satisfies Meta

export const Blank: Story = {
	parameters: {
		layers: { environment: '#app-environment' },
		known: [
			{ check: 'focus', slice: 'p5-kit-12', variants: ['light-1280', 'rtl-light-1280', 'light-390'], targets: ['input[data-slot=switch-input]'] },
			{ check: 'forced-colors', slice: 'p5-kit-12', variants: ['light-1280'], targets: ['input[data-slot=switch-input]'] },
			{ check: 'forced-colors', slice: 'p5-kit-13', variants: ['light-1280'], targets: ['span[data-slot=input-date-segment]'] },
			{ check: 'motion', slice: 'p5-kit-13', variants: ['light-1280 environment'], targets: ['div[data-slot=select-content]'] },
			{ check: 'row', slice: 'p5-kit-08', variants: ['light-1280', 'dark-1280', 'rtl-light-1280'], targets: ['div[data-slot=input-date]'] },
			{ check: 'still', slice: 'p5-kit-08', variants: ['light-1280', 'dark-1280', 'rtl-light-1280', 'light-390', 'dark-390'], targets: ['button[data-slot=button]', 'button[data-slot=input-date-trigger]', 'button[data-slot=select-trigger]', 'span[data-slot=input-date-segment]', 'textarea[data-slot=textarea]'] },
			{ check: 'still', slice: 'p5-kit-08', variants: ['light-390', 'dark-390'], targets: ['input[data-slot=input]'] },
		],
	},
	play: async ({ canvas, setArg }) => {
		// Two errors appear, one where help already is: no control may move.
		try {
			await assertStill(canvas, () => setArg('invalid', true))
			assertRowAligned(canvas)
		} finally {
			setArg('invalid', false)
		}
	},
}

export const Invalid: Story = {
	parameters: {
		known: [
			{ check: 'focus', slice: 'p5-kit-12', variants: ['light-1280', 'rtl-light-1280', 'light-390'], targets: ['input[data-slot=switch-input]'] },
			{ check: 'forced-colors', slice: 'p5-kit-12', variants: ['light-1280'], targets: ['input[data-slot=switch-input]'] },
			{ check: 'forced-colors', slice: 'p5-kit-13', variants: ['light-1280'], targets: ['span[data-slot=input-date-segment]'] },
			{ check: 'row', slice: 'p5-kit-08', variants: ['light-1280', 'dark-1280', 'rtl-light-1280'], targets: ['div[data-slot=input-date]'] },
			{ check: 'target-size', slice: 'p5-kit-13', variants: ['light-1280', 'dark-1280', 'rtl-light-1280', 'light-390', 'dark-390'], targets: ['span[data-slot=input-date-segment]'] },
		],
	},
	args: { filled: true, invalid: true },
	play: ({ canvas }) => {
		const name = canvas.querySelector<HTMLInputElement>('input[name="name"]')
		const error = canvas.querySelector<HTMLElement>('[data-slot="field-error"]')
		if (!name || !error) throw new Error('The invalid form did not render its first error')
		if (name.getAttribute('aria-invalid') !== 'true') throw new Error('The invalid app name is not aria-invalid')
		if (!name.getAttribute('aria-describedby')?.split(' ').includes(error.id)) throw new Error('The app name does not describe itself with its error')
	},
}

// The form's task by keyboard: the name and domain are filled, a memory limit is
// chosen from its Select with the arrow keys and Enter, and the form is submitted.
export const Submitting: Story = {
	parameters: {
		known: [
			{ check: 'focus', slice: 'p5-kit-12', variants: ['light-1280', 'rtl-light-1280', 'light-390'], targets: ['input[data-slot=switch-input]'] },
			{ check: 'forced-colors', slice: 'p5-kit-12', variants: ['light-1280'], targets: ['input[data-slot=switch-input]'] },
			{ check: 'forced-colors', slice: 'p5-kit-13', variants: ['light-1280'], targets: ['span[data-slot=input-date-segment]'] },
			{ check: 'row', slice: 'p5-kit-08', variants: ['light-1280', 'dark-1280', 'rtl-light-1280'], targets: ['div[data-slot=input-date]'] },
			{ check: 'target-size', slice: 'p5-kit-13', variants: ['light-1280', 'dark-1280', 'rtl-light-1280', 'light-390', 'dark-390'], targets: ['span[data-slot=input-date-segment]'] },
		],
	},
	args: { filled: true },
	play: async ({ canvas }) => {
		const memory = canvas.querySelector<HTMLButtonElement>('#app-memory')
		const form = canvas.querySelector('form')
		if (!memory || !form) throw new Error('The form has no memory limit')
		memory.focus()
		press(memory, 'ArrowDown')
		await until(() => !!document.activeElement?.matches('[data-slot="select-item"]'), 'ArrowDown on the memory limit did not open its options')
		const limit = t('1 GB', '1 غيغابايت')
		for (let step = 0; document.activeElement?.textContent?.trim() !== limit; step++) {
			if (step === 4) throw new Error(`ArrowDown did not reach ${limit}`)
			const item = document.activeElement as HTMLElement
			press(item, 'ArrowDown')
			await until(() => document.activeElement !== item, 'ArrowDown did not move through the memory limits')
		}
		press(document.activeElement as HTMLElement, 'Enter')
		await until(() => document.activeElement === memory && !!memory.textContent?.includes(limit), `Enter did not choose ${limit} and return to the Select`)
		// Enter in a text field submits natively, which a play's untrusted keys cannot do: requestSubmit() is that submission.
		form.requestSubmit()
		await until(() => canvas.querySelector('button[type="submit"]')?.getAttribute('aria-busy') === 'true', 'Submitting did not make Create app busy')

		const create = canvas.querySelector<HTMLButtonElement>('button[type="submit"]')!
		if (create.getAttribute('aria-disabled') !== 'true') throw new Error('The busy action is not aria-disabled')
		if (canvas.querySelector('input[data-slot="input"]:placeholder-shown')) throw new Error('The submitting form shows an empty field')
		memory.blur()
	},
}
