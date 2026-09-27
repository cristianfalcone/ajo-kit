/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from './app'
import { frame, wait, press } from './play'
import { Card, CardContent } from 'ajo-ui-playa/card'
import {
	Carousel,
	CarouselContext,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from 'ajo-ui-playa/carousel'
import { DirectionProvider } from 'ajo-ui-playa/direction'

export default {
	title: 'UI/Carousel',
	component: Carousel,
	parameters: {
		docs: { description: 'Native scroll-snap carousel with Ajo Kit composition and Ajo context.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Carousel>

const numbers = [1, 2, 3, 4, 5]
const consumerClick = (event: MouseEvent) => {
	const button = event.currentTarget as HTMLButtonElement
	button.dataset.consumerClicks = String(Number(button.dataset.consumerClicks ?? 0) + 1)
}
const cancelConsumerClick = (event: MouseEvent) => {
	consumerClick(event)
	event.preventDefault()
}

const Slide = ({ value, vertical = false }: { value: number; vertical?: boolean }) => (
	<div class="p-1">
		<Card>
			<CardContent class={vertical ? 'flex items-center justify-center p-6' : 'flex aspect-square items-center justify-center p-6'}>
				<span class="text-4xl font-semibold">{value}</span>
			</CardContent>
		</Card>
	</div>
)

const Readout = () => {
	const carousel = CarouselContext()

	return (
		<p data-carousel-readout="true" class="absolute inset-x-0 -bottom-8 text-center text-sm text-muted-foreground">
			Slide {carousel ? carousel.selected + 1 : 0} of {carousel?.count ?? 0}
		</p>
	)
}

const First = () => {
	const carousel = CarouselContext()

	return (
		<button
			class="absolute inset-x-0 -top-8 text-sm underline"
			data-carousel-first
			set:onclick={() => carousel?.scrollTo(0)}
			type="button"
		>
			First slide
		</button>
	)
}

const RenderBudgetDemo: Stateful = function* () {
	let loop = false
	let renders = 0
	const Probe = () => {
		const carousel = CarouselContext()
		if (!carousel) return null
		if ('setViewport' in carousel) throw new Error('CarouselContext exposed its private viewport registrar')
		renders++

		return (
			<output
				class="sr-only"
				data-carousel-render-count={renders}
				data-carousel-selected={carousel.selected}
			/>
		)
	}

	while (true) yield (
		<div class="grid gap-3">
			<button
				class="text-sm underline"
				data-carousel-loop-toggle
				set:onclick={() => this.next(() => loop = !loop)}
				type="button"
			>
				Toggle loop
			</button>
			<Carousel class="w-full max-w-xs" loop={loop}>
				<CarouselContent>
					<CarouselItem><Slide value={1} /></CarouselItem>
					<CarouselItem><Slide value={2} /></CarouselItem>
				</CarouselContent>
				<CarouselPrevious />
				<CarouselNext />
				<Probe />
			</Carousel>
		</div>
	)
}

export const Basic: Story = {
	render: () => (
		<Carousel class="w-full max-w-xs">
			<CarouselContent>
				{numbers.map(value => (
					<CarouselItem key={value}>
						<Slide value={value} />
					</CarouselItem>
				))}
			</CarouselContent>
			<CarouselPrevious set:onclick={cancelConsumerClick} />
			<CarouselNext set:onclick={consumerClick} />
		</Carousel>
	),
	play: async ({ canvas }) => {
		await frame()
		await wait(50)

		const root = canvas.querySelector<HTMLElement>('[data-slot="carousel"]')
		const track = canvas.querySelector<HTMLElement>('[data-slot="carousel-track"]')
		const previous = canvas.querySelector<HTMLButtonElement>('[data-slot="carousel-previous"]')
		const next = canvas.querySelector<HTMLButtonElement>('[data-slot="carousel-next"]')
		const items = canvas.querySelectorAll('[data-slot="carousel-item"]')
		if (!root || !track || !previous || !next || items.length !== 5) {
			throw new Error('Carousel composition was not rendered')
		}

		if (root.getAttribute('role') !== 'region' || root.getAttribute('aria-roledescription') !== 'carousel') {
			throw new Error('Carousel root did not expose carousel region semantics')
		}

		if (!previous.disabled || next.disabled) {
			throw new Error('Carousel buttons did not expose initial scroll state')
		}

		next.click()
		await wait(250)

		if (next.dataset.consumerClicks !== '1' || track.scrollLeft <= 0) {
			throw new Error('Carousel next button did not scroll the track')
		}
		if (previous.disabled) throw new Error('Carousel previous button did not become active after scrolling')

		let cancelledScrollCalls = 0
		const restorers = Array.from(items).map(item => {
			const descriptor = Object.getOwnPropertyDescriptor(item, 'scrollIntoView')
			Object.defineProperty(item, 'scrollIntoView', {
				configurable: true,
				value: () => cancelledScrollCalls++,
			})
			return () => descriptor
				? Object.defineProperty(item, 'scrollIntoView', descriptor)
				: Reflect.deleteProperty(item, 'scrollIntoView')
		})
		try {
			previous.click()
			await frame()
			if (previous.dataset.consumerClicks !== '1' || cancelledScrollCalls !== 0) {
				throw new Error('Carousel previous consumer handler did not cancel internal scrolling')
			}
		} finally {
			for (const restore of restorers) restore()
		}
	},
}

export const Sizes: Story = {
	render: () => (
		<Carousel class="w-full max-w-sm">
			<CarouselContent>
				{numbers.map(value => (
					<CarouselItem key={value} class="md:basis-1/2 lg:basis-1/3">
						<Slide value={value} />
					</CarouselItem>
				))}
			</CarouselContent>
			<CarouselPrevious />
			<CarouselNext />
		</Carousel>
	),
	play: async ({ canvas }) => {
		const item = canvas.querySelector<HTMLElement>('[data-slot="carousel-item"]')
		if (!item || !item.className.includes('lg:basis-1/3')) {
			throw new Error('Carousel item custom basis classes were not preserved')
		}
	},
}

export const Vertical: Story = {
	render: () => (
		<Carousel orientation="vertical" class="my-12 w-full max-w-xs">
			<CarouselContent class="-mt-1 h-[220px]">
				{numbers.map(value => (
					<CarouselItem key={value} class="pt-1 md:basis-1/2">
						<Slide value={value} vertical />
					</CarouselItem>
				))}
			</CarouselContent>
			<CarouselPrevious />
			<CarouselNext />
		</Carousel>
	),
	play: async ({ canvas }) => {
		await frame()
		await wait(50)

		const root = canvas.querySelector<HTMLElement>('[data-slot="carousel"]')
		const track = canvas.querySelector<HTMLElement>('[data-slot="carousel-track"]')
		const next = canvas.querySelector<HTMLButtonElement>('[data-slot="carousel-next"]')
		if (!root || !track || !next) throw new Error('Vertical carousel was not rendered')

		if (root.getAttribute('data-axis') !== 'y' || track.getAttribute('data-axis') !== 'y') {
			throw new Error('Vertical carousel did not expose y axis')
		}

		next.click()
		await wait(250)

		if (track.scrollTop <= 0) {
			throw new Error('Vertical carousel next button did not scroll down')
		}
	},
}

export const Looping: Story = {
	render: () => (
		<Carousel loop class="my-8 w-full max-w-xs">
			<CarouselContent>
				{[1, 2, 3].map(value => (
					<CarouselItem key={value}>
						<Slide value={value} />
					</CarouselItem>
				))}
			</CarouselContent>
			<CarouselPrevious />
			<CarouselNext />
			<First />
			<Readout />
		</Carousel>
	),
	play: async ({ canvas }) => {
		await frame()
		await wait(80)

		const readout = canvas.querySelector<HTMLElement>('[data-carousel-readout]')
		const previous = canvas.querySelector<HTMLButtonElement>('[data-slot="carousel-previous"]')
		const first = canvas.querySelector<HTMLButtonElement>('[data-carousel-first]')
		if (!readout || !previous || !first) throw new Error('Looping carousel story was not rendered')

		if (readout.textContent?.trim() !== 'Slide 1 of 3' || previous.disabled) {
			throw new Error('Carousel context did not expose initial loop state')
		}

		previous.click()
		await wait(250)

		if (readout.textContent?.trim() !== 'Slide 3 of 3') {
			throw new Error('Looping carousel did not wrap to the last slide')
		}

		first.click()
		await wait(250)

		if (readout.textContent?.trim() !== 'Slide 1 of 3') {
			throw new Error('Carousel context scrollTo did not reach the first slide')
		}
	},
}

export const RightToLeft: Story = {
	name: 'Right to Left',
	render: () => (
		<DirectionProvider dir="rtl">
			<Carousel class="mb-8 w-full max-w-xs">
				<CarouselContent>
					{numbers.map(value => (
						<CarouselItem key={value}>
							<Slide value={value} />
						</CarouselItem>
					))}
				</CarouselContent>
				<CarouselPrevious />
				<CarouselNext />
				<Readout />
			</Carousel>
		</DirectionProvider>
	),
	play: async ({ canvas }) => {
		await frame()
		await wait(50)

		const root = canvas.querySelector<HTMLElement>('[data-slot="carousel"]')
		const track = canvas.querySelector<HTMLElement>('[data-slot="carousel-track"]')
		const previous = canvas.querySelector<HTMLButtonElement>('[data-slot="carousel-previous"]')
		const next = canvas.querySelector<HTMLButtonElement>('[data-slot="carousel-next"]')
		const readout = canvas.querySelector<HTMLElement>('[data-carousel-readout]')
		if (!root || !track || !previous || !next || !readout) throw new Error('RTL carousel was not rendered')

		const slide = () => readout.textContent?.trim()
		const key = async (name: string) => {
			press(root, name)
			await wait(250)
		}

		if (root.hasAttribute('dir') || getComputedStyle(root).direction !== 'rtl') throw new Error('Carousel did not inherit rtl from DirectionProvider')
		if (slide() !== 'Slide 1 of 5' || !previous.disabled || next.disabled) {
			throw new Error('RTL carousel did not start on the first slide')
		}
		if (previous.getBoundingClientRect().left <= next.getBoundingClientRect().left) {
			throw new Error('RTL carousel did not place previous on the inline start side')
		}
		if (getComputedStyle(previous.querySelector('[aria-hidden]')!).rotate !== '180deg') {
			throw new Error('RTL carousel did not flip the previous arrow')
		}

		await key('ArrowLeft')
		if (track.scrollLeft >= 0 || slide() !== 'Slide 2 of 5' || previous.disabled) {
			throw new Error('ArrowLeft did not advance the RTL carousel')
		}

		next.click()
		await wait(250)
		if (slide() !== 'Slide 3 of 5') throw new Error('RTL next button did not select the centered slide')

		await key('ArrowRight')
		if (slide() !== 'Slide 2 of 5') throw new Error('ArrowRight did not go back in the RTL carousel')
	},
}

export const RenderBudget: Story = {
	name: 'Render Budget',
	render: () => <RenderBudgetDemo />,
	play: async ({ canvas }) => {
		await frame()
		await wait(50)

		const track = canvas.querySelector<HTMLElement>('[data-slot="carousel-track"]')
		const items = [...canvas.querySelectorAll<HTMLElement>('[data-slot="carousel-item"]')]
		const previous = canvas.querySelector<HTMLButtonElement>('[data-slot="carousel-previous"]')
		const next = canvas.querySelector<HTMLButtonElement>('[data-slot="carousel-next"]')
		const loop = canvas.querySelector<HTMLButtonElement>('[data-carousel-loop-toggle]')
		if (!track || items.length !== 2 || !previous || !next || !loop) {
			throw new Error('Carousel render-budget fixture was not rendered')
		}

		// Each slide is one track wide; `position` is the slide scrolled into view.
		let position = 0
		items.forEach((item, index) => {
			Object.defineProperty(item, 'getBoundingClientRect', {
				configurable: true,
				value: () => {
					const view = track.getBoundingClientRect()
					return new DOMRect(view.left + (index - position) * view.width, view.top, view.width, view.height)
				},
			})
		})

		const probe = () => {
			const element = canvas.querySelector<HTMLElement>('[data-carousel-render-count]')
			if (!element) throw new Error('Carousel render probe disappeared')
			return element
		}
		const flushScroll = async () => {
			track.dispatchEvent(new Event('scroll'))
			await frame(2)
		}

		await flushScroll()
		const baseline = Number(probe().dataset.carouselRenderCount)
		track.dispatchEvent(new Event('scroll'))
		track.dispatchEvent(new Event('scroll'))
		await flushScroll()
		if (Number(probe().dataset.carouselRenderCount) !== baseline) {
			throw new Error('Same-slide scroll re-rendered the Carousel subtree')
		}

		position = 1
		await flushScroll()
		if (
			Number(probe().dataset.carouselRenderCount) !== baseline + 1
			|| probe().dataset.carouselSelected !== '1'
			|| previous.disabled
			|| !next.disabled
		) {
			throw new Error('Selection change did not produce exactly one observable Carousel render')
		}

		const resizeTrack = async () => {
			const beforeWidth = track.getBoundingClientRect().width
			await new Promise<void>((resolve, reject) => {
				const observer = new ResizeObserver(entries => {
					const width = entries.find(entry => entry.target === track)?.contentRect.width
					if (width == null || width === beforeWidth) return

					clearTimeout(timeout)
					observer.disconnect()
					resolve()
				})
				const timeout = setTimeout(() => {
					observer.disconnect()
					reject(new Error('Carousel render-budget resize was not observed'))
				}, 1000)
				observer.observe(track)
				track.style.width = `${Math.round(beforeWidth) + 37}px`
			})
			await frame(2)
		}

		const resizeSelectionBaseline = Number(probe().dataset.carouselRenderCount)
		position = 0
		await resizeTrack()
		if (
			Number(probe().dataset.carouselRenderCount) !== resizeSelectionBaseline + 1
			|| probe().dataset.carouselSelected !== '0'
			|| !previous.disabled
			|| next.disabled
		) {
			throw new Error('Resize-driven selection change did not produce exactly one Carousel render')
		}

		const stableResizeBaseline = Number(probe().dataset.carouselRenderCount)
		await resizeTrack()
		if (Number(probe().dataset.carouselRenderCount) !== stableResizeBaseline) {
			throw new Error('Selection-stable resize re-rendered the Carousel subtree')
		}

		loop.click()
		await frame()
		if (previous.disabled || next.disabled) {
			throw new Error('Dynamic loop did not refresh Carousel scrollability')
		}
		const loopBaseline = Number(probe().dataset.carouselRenderCount)
		await flushScroll()
		if (Number(probe().dataset.carouselRenderCount) !== loopBaseline) {
			throw new Error('Stable looped scroll state re-rendered the Carousel subtree')
		}
	},
}
