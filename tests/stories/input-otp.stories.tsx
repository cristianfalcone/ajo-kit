/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from './app'
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from 'ajo-ui-playa/field'
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
	REGEXP_ONLY_DIGITS,
	REGEXP_ONLY_DIGITS_AND_CHARS,
} from 'ajo-ui-playa/input-otp'

export default {
	title: 'UI/Input OTP',
	component: InputOTP,
	parameters: {
		docs: { description: 'One-time password input with visible slots, paste support, patterns, and controlled state.' },
		layout: 'centered',
	},
} satisfies Meta<typeof InputOTP>

const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

const tokens = (value: string | null) => new Set((value ?? '').split(/\s+/).filter(Boolean))

const assertFieldControl = (canvas: HTMLElement, name: string, expectedId?: string) => {
	const field = canvas.querySelector<HTMLElement>(`[data-story-field="${name}"]`)
	const label = field?.querySelector<HTMLLabelElement>('[data-slot="field-label"]')
	const description = field?.querySelector<HTMLElement>('[data-slot="field-description"]')
	const error = field?.querySelector<HTMLElement>('[data-slot="field-error"]')
	const control = field?.querySelector<HTMLInputElement>('[data-slot="input-otp-input"]')
	if (!field || !label || !description || !error || !control) throw new Error(`Input OTP field wiring story did not render ${name}`)

	const labelFor = label.getAttribute('for')
	if (!labelFor || control.id !== labelFor) throw new Error(`Input OTP ${name} id did not match its label for attribute`)
	if (expectedId && control.id !== expectedId) throw new Error(`Input OTP ${name} did not keep its manual id`)

	const describedby = tokens(control.getAttribute('aria-describedby'))
	if (!describedby.has(description.id) || !describedby.has(error.id)) {
		throw new Error(`Input OTP ${name} aria-describedby did not include description and error ids`)
	}
	if (control.getAttribute('aria-invalid') !== 'true') throw new Error(`Input OTP ${name} did not receive aria-invalid`)
	if (control.getAttribute('aria-errormessage') !== error.id) throw new Error(`Input OTP ${name} did not receive aria-errormessage`)
}

const input = (canvas: HTMLElement) => {
	const control = canvas.querySelector<HTMLInputElement>('[data-slot="input-otp-input"]')
	if (!control) throw new Error('Input OTP input was not rendered')
	return control
}

const slotValue = (canvas: HTMLElement) =>
	Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot="input-otp-slot"]'))
		.map(slot => slot.textContent?.trim() ?? '')
		.join('')

const write = async (canvas: HTMLElement, value: string) => {
	const control = input(canvas)
	control.focus()
	control.value = value
	control.dispatchEvent(new Event('input', { bubbles: true }))
	await nextFrame()
	return control
}

const paste = async (canvas: HTMLElement, value: string) => {
	const control = input(canvas)
	const event = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent
	Object.defineProperty(event, 'clipboardData', {
		value: { getData: (type: string) => type === 'text' ? value : '' },
	})
	control.dispatchEvent(event)
	await nextFrame()
}

const ControlledExample: Stateful = function* () {
	let value = ''
	const setValue = (next: string) => this.next(() => value = next)

	while (true) yield (
		<Field class="w-80">
			<FieldLabel for="controlled-otp">Verification code</FieldLabel>
			<InputOTP
				id="controlled-otp"
				name="controlled-otp"
				value={value}
				onValueChange={setValue}
				maxLength={6}
				pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
				inputmode="text"
			>
				<InputOTPGroup>
					<InputOTPSlot index={0} />
					<InputOTPSlot index={1} />
					<InputOTPSlot index={2} />
					<InputOTPSlot index={3} />
					<InputOTPSlot index={4} />
					<InputOTPSlot index={5} />
				</InputOTPGroup>
			</InputOTP>
			<FieldDescription>{value ? `You entered: ${value}` : 'Enter your one-time password.'}</FieldDescription>
		</Field>
	)
}

const CompleteExample: Stateful = function* () {
	let complete = ''
	const setComplete = (next: string) => this.next(() => complete = next)

	while (true) yield (
		<Field class="w-80">
			<FieldLabel>One-time password</FieldLabel>
			<InputOTP maxLength={6} pattern={REGEXP_ONLY_DIGITS} onComplete={setComplete}>
				<InputOTPGroup>
					<InputOTPSlot index={0} />
					<InputOTPSlot index={1} />
					<InputOTPSlot index={2} />
				</InputOTPGroup>
				<InputOTPSeparator />
				<InputOTPGroup>
					<InputOTPSlot index={3} />
					<InputOTPSlot index={4} />
					<InputOTPSlot index={5} />
				</InputOTPGroup>
			</InputOTP>
			<FieldDescription>{complete ? `Complete: ${complete}` : 'Waiting for 6 digits.'}</FieldDescription>
		</Field>
	)
}

export const Basic: Story = {
	render: () => (
		<InputOTP class="otp-root-contract" inputClass="otp-input-contract" maxLength={6} pattern={REGEXP_ONLY_DIGITS}>
			<InputOTPGroup>
				<InputOTPSlot index={0} />
				<InputOTPSlot index={1} />
				<InputOTPSlot index={2} />
			</InputOTPGroup>
			<InputOTPSeparator />
			<InputOTPGroup>
				<InputOTPSlot index={3} />
				<InputOTPSlot index={4} />
				<InputOTPSlot index={5} />
			</InputOTPGroup>
		</InputOTP>
	),
	play: async ({ canvas }) => {
		const root = canvas.querySelector<HTMLElement>('[data-slot="input-otp"]')
		const control = input(canvas)
		if (!root?.classList.contains('otp-root-contract') || root.classList.contains('otp-input-contract')) {
			throw new Error('Input OTP class did not belong exclusively to the visible root')
		}
		if (!control.classList.contains('otp-input-contract') || control.classList.contains('otp-root-contract')) {
			throw new Error('Input OTP inputClass did not belong exclusively to the hidden input')
		}
		await write(canvas, '123456')
		if (slotValue(canvas) !== '123456') {
			throw new Error('Input OTP did not mirror typed digits into visible slots')
		}
	},
}

export const Separator: Story = {
	render: () => (
		<InputOTP maxLength={6} pattern={REGEXP_ONLY_DIGITS}>
			<InputOTPGroup>
				<InputOTPSlot index={0} />
				<InputOTPSlot index={1} />
			</InputOTPGroup>
			<InputOTPSeparator />
			<InputOTPGroup>
				<InputOTPSlot index={2} />
				<InputOTPSlot index={3} />
			</InputOTPGroup>
			<InputOTPSeparator />
			<InputOTPGroup>
				<InputOTPSlot index={4} />
				<InputOTPSlot index={5} />
			</InputOTPGroup>
		</InputOTP>
	),
	play: async ({ canvas }) => {
		await paste(canvas, '987654')
		if (slotValue(canvas) !== '987654') {
			throw new Error('Input OTP did not paste into grouped slots')
		}
	},
}

export const DigitsOnly: Story = {
	render: () => (
		<InputOTP maxLength={6} pattern={REGEXP_ONLY_DIGITS}>
			<InputOTPGroup>
				<InputOTPSlot index={0} />
				<InputOTPSlot index={1} />
				<InputOTPSlot index={2} />
				<InputOTPSlot index={3} />
				<InputOTPSlot index={4} />
				<InputOTPSlot index={5} />
			</InputOTPGroup>
		</InputOTP>
	),
	play: async ({ canvas }) => {
		await write(canvas, '12AB34')
		if (slotValue(canvas) !== '1234') {
			throw new Error('Input OTP digit pattern did not filter non-digits')
		}
	},
}

export const Controlled: Story = {
	render: () => <ControlledExample />,
	play: async ({ canvas }) => {
		await write(canvas, 'A1B2C3')
		if (!canvas.textContent?.includes('You entered: A1B2C3')) {
			throw new Error('Controlled Input OTP did not report changes')
		}
	},
}

export const Completion: Story = {
	render: () => <CompleteExample />,
	play: async ({ canvas }) => {
		await write(canvas, '654321')
		if (!canvas.textContent?.includes('Complete: 654321')) {
			throw new Error('Input OTP did not call onComplete')
		}
	},
}

export const FieldWiring: Story = {
	render: () => (
		<div class="grid w-full max-w-sm gap-6">
			<Field name="otp-auto-wire" invalid data-story-field="auto">
				<FieldLabel>Verification code</FieldLabel>
				<InputOTP maxLength={6} pattern={REGEXP_ONLY_DIGITS}>
					<InputOTPGroup>
						<InputOTPSlot index={0} />
						<InputOTPSlot index={1} />
						<InputOTPSlot index={2} />
						<InputOTPSlot index={3} />
						<InputOTPSlot index={4} />
						<InputOTPSlot index={5} />
					</InputOTPGroup>
				</InputOTP>
				<FieldDescription>Enter the code sent to your email.</FieldDescription>
				<FieldError>Enter a valid verification code.</FieldError>
			</Field>
			<Field name="otp-manual-wire" invalid data-story-field="manual">
				<FieldLabel for="manual-otp-control">Manual verification code</FieldLabel>
				<InputOTP id="manual-otp-control" maxLength={6} pattern={REGEXP_ONLY_DIGITS}>
					<InputOTPGroup>
						<InputOTPSlot index={0} />
						<InputOTPSlot index={1} />
						<InputOTPSlot index={2} />
						<InputOTPSlot index={3} />
						<InputOTPSlot index={4} />
						<InputOTPSlot index={5} />
					</InputOTPGroup>
				</InputOTP>
				<FieldDescription>Manual OTP keeps its caller id.</FieldDescription>
				<FieldError>Enter a valid manual verification code.</FieldError>
			</Field>
		</div>
	),
	play: async ({ canvas }) => {
		await nextFrame()
		await nextFrame()

		assertFieldControl(canvas, 'auto')
		assertFieldControl(canvas, 'manual', 'manual-otp-control')
	},
}

export const Invalid: Story = {
	render: () => (
		<InputOTP maxLength={6} value="000000" pattern={REGEXP_ONLY_DIGITS}>
			<InputOTPGroup>
				<InputOTPSlot index={0} aria-invalid="true" />
				<InputOTPSlot index={1} aria-invalid="true" />
				<InputOTPSlot index={2} aria-invalid="true" />
				<InputOTPSlot index={3} aria-invalid="true" />
				<InputOTPSlot index={4} aria-invalid="true" />
				<InputOTPSlot index={5} aria-invalid="true" />
			</InputOTPGroup>
		</InputOTP>
	),
	play: async ({ canvas }) => {
		const invalid = canvas.querySelectorAll('[data-slot="input-otp-slot"][aria-invalid="true"]')
		if (invalid.length !== 6 || slotValue(canvas) !== '000000') {
			throw new Error('Invalid Input OTP slots were not rendered')
		}
	},
}

export const Disabled: Story = {
	render: () => (
		<InputOTP maxLength={6} value="123456" disabled>
			<InputOTPGroup>
				<InputOTPSlot index={0} />
				<InputOTPSlot index={1} />
				<InputOTPSlot index={2} />
				<InputOTPSlot index={3} />
				<InputOTPSlot index={4} />
				<InputOTPSlot index={5} />
			</InputOTPGroup>
		</InputOTP>
	),
	play: async ({ canvas }) => {
		const control = input(canvas)
		const root = canvas.querySelector<HTMLElement>('[data-slot="input-otp"]')
		if (!control.disabled || root?.getAttribute('data-disabled') !== 'true') {
			throw new Error('Disabled Input OTP did not propagate disabled state')
		}
	},
}
