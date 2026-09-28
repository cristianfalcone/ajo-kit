/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from './app'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from 'ajo-ui-playa/breadcrumb'
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
			<div class="w-80 rounded-md border p-4 text-start">
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

// An app that sets `dir` on <html> needs no provider. The story sets it and
// lifts the harness's own provider for as long as it shows, so the page is the
// one ancestor that says which way it reads; leaving restores both.
const DocumentPage: Stateful = function* () {
	const root = document.documentElement
	const saved = (['dir', 'lang'] as const).map(name => [name, root.getAttribute(name)] as const)
	let harness: Element | null = null
	let harnessDir: string | null = null
	root.dir = 'rtl'
	root.lang = 'ar'
	queueMicrotask(() => {
		harness = this.closest('[data-slot="direction-provider"]')
		harnessDir = harness?.getAttribute('dir') ?? null
		harness?.removeAttribute('dir')
	})
	this.signal.addEventListener('abort', () => {
		for (const [name, value] of saved) value === null ? root.removeAttribute(name) : root.setAttribute(name, value)
		if (harnessDir) harness?.setAttribute('dir', harnessDir)
	})

	while (true) yield (
		<div class="grid w-80 gap-3">
			<p data-slot="direction-readout">اتجاه الصفحة: من اليمين إلى اليسار</p>
			<Breadcrumb aria-label="مسار التنقل">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/"><bdi>host-01</bdi></BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>التطبيقات</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
		</div>
	)
}

export const DocumentDir: Story = {
	render: () => <DocumentPage />,
	play: async ({ canvas }) => {
		if (canvas.querySelector('[data-slot="direction-readout"]')?.closest('[dir]') !== document.documentElement) throw new Error('Something other than <html> sets the direction')
		if (directions(canvas) !== 'rtl') throw new Error('The page did not read right to left from <html dir>')
		const [first, page] = ['[data-slot="breadcrumb-link"]', '[data-slot="breadcrumb-page"]'].map(selector => canvas.querySelector<HTMLElement>(selector)!.getBoundingClientRect())
		if (first.left < page.right) throw new Error('The breadcrumb did not run right to left')
		const chevron = canvas.querySelector<HTMLElement>('[data-slot="breadcrumb-separator"] > :last-child')!
		if (getComputedStyle(chevron).scale !== '-1 1') throw new Error('The breadcrumb chevron did not turn to point along the reading direction')
	},
}
