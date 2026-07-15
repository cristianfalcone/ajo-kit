/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import { AspectRatio } from 'ajo-ui-playa/aspect-ratio'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'ajo-ui-playa/card'

export default {
	title: 'UI/Aspect Ratio',
	component: AspectRatio,
	args: {
		ratio: 16 / 9,
	},
	argTypes: {
		ratio: {
			control: 'number',
			description: 'Width divided by height.',
			min: 0.25,
			max: 3,
			step: 0.01,
		},
	},
	parameters: {
		docs: { description: 'Responsive ratio box for media and fixed-format content.' },
		layout: 'centered',
	},
} satisfies Meta<typeof AspectRatio>

const imageSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#6cc3d5"/>
      <stop offset="0.48" stop-color="#3596ac"/>
      <stop offset="1" stop-color="#fcb53b"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#g)"/>
  <circle cx="930" cy="210" r="120" fill="#fff9ec" opacity="0.92"/>
  <path d="M0 590L190 460L360 545L555 360L780 575L955 420L1200 620V800H0Z" fill="#1b3c53" opacity="0.82"/>
  <path d="M0 680L260 530L520 650L740 520L1200 710V800H0Z" fill="#0f2334" opacity="0.55"/>
  <text x="72" y="110" fill="#f5fafc" font-family="Arial, sans-serif" font-size="52" font-weight="700">Ajo media</text>
</svg>
`

const image = `data:image/svg+xml,${encodeURIComponent(imageSvg.trim())}`

const ratio = (args: Record<string, unknown>, fallback = 16 / 9) =>
	typeof args.ratio === 'number' && Number.isFinite(args.ratio) && args.ratio > 0
		? args.ratio
		: fallback

const root = (canvas: HTMLElement) =>
	canvas.querySelector<HTMLElement>('[data-slot="aspect-ratio"]')

const assertRatio = (canvas: HTMLElement, expected: number) => {
	const el = root(canvas)
	if (!el) throw new Error('AspectRatio root was not rendered')

	const box = el.getBoundingClientRect()
	if (!box.width || !box.height) throw new Error('AspectRatio root has no rendered size')

	const actual = box.width / box.height
	if (Math.abs(actual - expected) > 0.04) {
		throw new Error(`AspectRatio expected ${expected.toFixed(3)}, got ${actual.toFixed(3)}`)
	}
}

export const Basic: Story<typeof AspectRatio> = {
	render: args => (
		<div class="w-[420px]">
			<AspectRatio ratio={ratio(args)} class="overflow-hidden rounded-lg edge bg-muted shadow-xs">
				<div class="flex h-full w-full items-center justify-center text-white" style="background:linear-gradient(135deg,#6cc3d5,#3596ac 45%,#234c6a)">
					<div class="text-center">
						<div class="text-2xl font-semibold">16:9</div>
						<div class="text-sm opacity-85">Responsive frame</div>
					</div>
				</div>
			</AspectRatio>
		</div>
	),
	play: async ({ canvas }) => assertRatio(canvas, 16 / 9),
}

export const Square: Story<typeof AspectRatio> = {
	argTypes: { ratio: { control: false } },
	render: () => (
		<div class="w-64">
			<AspectRatio ratio={1} class="overflow-hidden rounded-lg edge bg-card shadow-xs">
				<div class="grid h-full w-full place-items-center text-white" style="background:radial-gradient(circle at 30% 25%,#6cc3d5,#234c6a 42%,#0f2334 100%)">
					<div class="rounded-md bg-background/85 px-3 py-2 text-sm font-medium text-foreground shadow-xs">
						1:1
					</div>
				</div>
			</AspectRatio>
		</div>
	),
	play: async ({ canvas }) => assertRatio(canvas, 1),
}

export const Portrait: Story<typeof AspectRatio> = {
	argTypes: { ratio: { control: false } },
	render: () => (
		<div class="w-48">
			<AspectRatio ratio={9 / 16} class="overflow-hidden rounded-lg edge bg-muted shadow-xs">
				<div class="flex h-full w-full flex-col justify-between p-4 text-white" style="background:linear-gradient(180deg,#d98e85,#a94b4c 45%,#1b3c53)">
					<span class="text-sm font-medium uppercase">Portrait</span>
					<span class="text-3xl font-semibold">9:16</span>
				</div>
			</AspectRatio>
		</div>
	),
	play: async ({ canvas }) => assertRatio(canvas, 9 / 16),
}

export const Image: Story<typeof AspectRatio> = {
	argTypes: { ratio: { control: false } },
	render: () => (
		<div class="w-[420px]">
			<AspectRatio ratio={16 / 9} class="overflow-hidden rounded-lg bg-muted">
				<img
					src={image}
					alt="Abstract landscape"
					class="h-full w-full object-cover dark:brightness-75"
				/>
			</AspectRatio>
		</div>
	),
	play: async ({ canvas }) => {
		assertRatio(canvas, 16 / 9)

		const frame = root(canvas)
		const img = canvas.querySelector<HTMLImageElement>('img')
		if (!frame || !img) throw new Error('Image story did not render media')

		const outer = frame.getBoundingClientRect()
		const media = img.getBoundingClientRect()
		if (Math.abs(outer.width - media.width) > 1 || Math.abs(outer.height - media.height) > 1) {
			throw new Error('Image does not fill the AspectRatio frame')
		}
	},
}

export const CardMedia: Story<typeof AspectRatio> = {
	argTypes: { ratio: { control: false } },
	render: () => (
		<Card class="w-[360px]">
			<CardHeader>
				<CardTitle>Project preview</CardTitle>
				<CardDescription>Media stays stable while the card width changes.</CardDescription>
			</CardHeader>
			<CardContent>
				<AspectRatio ratio={4 / 3} class="overflow-hidden rounded-md bg-muted">
					<img
						src={image}
						alt="Project preview"
						class="h-full w-full object-cover"
					/>
				</AspectRatio>
			</CardContent>
		</Card>
	),
	play: async ({ canvas }) => assertRatio(canvas, 4 / 3),
}
