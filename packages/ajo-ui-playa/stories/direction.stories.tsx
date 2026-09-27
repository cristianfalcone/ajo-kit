/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import { DirectionProvider } from 'ajo-ui-playa/direction'

// Components read direction from the DOM, so the stories check what layout resolves.
const directions = (canvas: HTMLElement) =>
	Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot="direction-readout"]'), node => getComputedStyle(node).direction).join('|')

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
		docs: { description: 'Ajo direction provider: an inherited HTML dir on its subtree.' },
		layout: 'centered',
	},
} satisfies Meta<typeof DirectionProvider>

export const RTL: Story = {
	render: args => (
		<DirectionProvider dir={args.dir}>
			<div class="w-80 rounded-md border p-4 text-right">
				<h2 class="font-semibold">تسجيل الدخول إلى حسابك</h2>
				<p class="mt-2 text-sm text-muted-foreground">أدخل بريدك الإلكتروني أدناه لتسجيل الدخول إلى حسابك</p>
				<p class="mt-2 text-sm" data-slot="direction-readout">اتجاه النص: من اليمين إلى اليسار</p>
			</div>
		</DirectionProvider>
	),
	play: async ({ canvas }) => {
		const provider = canvas.querySelector<HTMLElement>('[data-slot="direction-provider"]')
		if (!provider) throw new Error('Direction provider was not rendered')

		if (provider.getAttribute('dir') !== 'rtl' || directions(canvas) !== 'rtl') {
			throw new Error('Direction provider did not set RTL on its subtree')
		}
	},
}

export const DirProp: Story = {
	render: () => (
		<DirectionProvider dir="ltr">
			<p data-slot="direction-readout">Text direction: left to right</p>
		</DirectionProvider>
	),
	play: async ({ canvas }) => {
		const provider = canvas.querySelector<HTMLElement>('[data-slot="direction-provider"]')
		if (!provider) throw new Error('Direction dir story was not rendered')

		if (provider.getAttribute('dir') !== 'ltr' || directions(canvas) !== 'ltr') {
			throw new Error('Direction provider did not honor dir')
		}
	},
}

export const Nested: Story = {
	render: () => (
		<DirectionProvider dir="rtl">
			<div class="grid gap-3">
				<p data-slot="direction-readout">اتجاه النص: من اليمين إلى اليسار</p>
				<DirectionProvider dir="ltr">
					<p data-slot="direction-readout">Text direction: left to right</p>
				</DirectionProvider>
			</div>
		</DirectionProvider>
	),
	play: async ({ canvas }) => {
		if (directions(canvas) !== 'rtl|ltr') throw new Error('Nested direction did not override the parent value')
	},
}
