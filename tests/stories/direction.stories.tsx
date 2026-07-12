/** @jsxImportSource ajo */
import type { Stateless } from 'ajo'
import type { Meta, Story } from './app'
import { DirectionContext, DirectionProvider } from '/src/ui/direction'

const DirectionReadout: Stateless = () => (
	<p data-slot="direction-readout">Current direction: {DirectionContext()}</p>
)

export default {
	title: 'UI/Direction',
	component: DirectionProvider,
	args: {
		dir: 'rtl',
	},
	argTypes: {
		dir: { control: 'radio', options: ['ltr', 'rtl'] },
	},
	parameters: {
		docs: { description: 'Ajo direction provider with inherited HTML dir and context readout.' },
		layout: 'centered',
	},
} satisfies Meta<typeof DirectionProvider>

export const RTL: Story = {
	render: args => (
		<DirectionProvider dir={args.dir}>
			<div class="w-80 rounded-md border p-4 text-right">
				<h2 class="font-semibold">تسجيل الدخول إلى حسابك</h2>
				<p class="mt-2 text-sm text-muted-foreground">أدخل بريدك الإلكتروني أدناه لتسجيل الدخول إلى حسابك</p>
				<DirectionReadout />
			</div>
		</DirectionProvider>
	),
	play: async ({ canvas }) => {
		const provider = canvas.querySelector<HTMLElement>('[data-slot="direction-provider"]')
		const readout = canvas.querySelector<HTMLElement>('[data-slot="direction-readout"]')
		if (!provider || !readout) throw new Error('Direction provider or readout was not rendered')

		if (provider.getAttribute('dir') !== 'rtl' || readout.textContent !== 'Current direction: rtl') {
			throw new Error('Direction provider did not expose RTL direction')
		}
	},
}

export const DirProp: Story = {
	argTypes: { dir: { control: false } },
	render: () => (
		<DirectionProvider dir="ltr">
			<DirectionReadout />
		</DirectionProvider>
	),
	play: async ({ canvas }) => {
		const provider = canvas.querySelector<HTMLElement>('[data-slot="direction-provider"]')
		const readout = canvas.querySelector<HTMLElement>('[data-slot="direction-readout"]')
		if (!provider || !readout) throw new Error('Direction dir story was not rendered')

		if (provider.getAttribute('dir') !== 'ltr' || readout.textContent !== 'Current direction: ltr') {
			throw new Error('Direction provider did not honor dir')
		}
	},
}

export const Nested: Story = {
	argTypes: { dir: { control: false } },
	render: () => (
		<DirectionProvider dir="rtl">
			<div class="grid gap-3">
				<DirectionReadout />
				<DirectionProvider dir="ltr">
					<DirectionReadout />
				</DirectionProvider>
			</div>
		</DirectionProvider>
	),
	play: async ({ canvas }) => {
		const readouts = Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot="direction-readout"]'))
		if (readouts.length !== 2) throw new Error('Nested direction readouts were not rendered')

		if (readouts.map(node => node.textContent).join('|') !== 'Current direction: rtl|Current direction: ltr') {
			throw new Error('Nested direction context did not override parent value')
		}
	},
}
