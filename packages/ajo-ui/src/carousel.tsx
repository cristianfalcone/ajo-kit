import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { callHandler, clamp, listen, resize, scrolling, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'
import { type Direction, DirectionContext } from './direction'
import type { OmitArg } from './utils'

/** Layout axis used by a Carousel. */
export type CarouselOrientation =
	| 'horizontal'
	| 'vertical'

/** Arguments for the Carousel root. */
export type CarouselArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'dir'> & {
	/** Text direction for horizontal navigation. Defaults to the nearest DirectionProvider. */
	dir?: Direction
	/** Loop previous and next navigation at the ends. */
	loop?: boolean
	/** Orientation of the carousel track. */
	orientation?: CarouselOrientation
}>

/** Arguments for the Carousel track and viewport composition. */
export type CarouselContentArgs = WithChildren<IntrinsicElements['div']>

/** Arguments for one snap-aligned Carousel item. */
export type CarouselItemArgs = WithChildren<IntrinsicElements['div']>

/** Shared arguments for previous and next Carousel buttons. */
export type CarouselButtonArgs = WithChildren<IntrinsicElements['button']>

/** Observable state and controls inherited from the nearest Carousel. */
export type CarouselContextValue = {
	canScrollNext: boolean
	canScrollPrev: boolean
	count: number
	orientation: CarouselOrientation
	scrollNext: () => void
	scrollPrev: () => void
	scrollTo: (index: number) => void
	selected: number
}

type CarouselPartsContextValue = {
	setViewport: (element: HTMLElement | null) => void
}

type CarouselRootArgs = WithChildren<{
	dir: Direction
	loop: boolean
	orientation: CarouselOrientation
}>

/** Read the observable state and controls inherited from the nearest Carousel. */
export const CarouselContext = context<CarouselContextValue | null>(null)
const CarouselPartsContext = context<CarouselPartsContextValue | null>(null)

const carousel = () => {
	const value = CarouselContext()
	if (!value) throw new Error('Carousel parts must be used within a <Carousel />')
	return value
}

const carouselParts = () => {
	const value = CarouselPartsContext()
	if (!value) throw new Error('Carousel parts must be used within a <Carousel />')
	return value
}

const CarouselRoot: Stateful<CarouselRootArgs> = function* () {
	let viewport: HTMLElement | null = null
	let dir: Direction = 'ltr'
	let horizontal = true
	let loop = false
	let selected = 0
	let count = 0
	let canScrollPrev = false
	let canScrollNext = false

	const items = () => viewport
		? Array.from(viewport.querySelectorAll<HTMLElement>('[data-slot="carousel-item"]'))
		: []

	// Client rects share one origin: no offset parent, and no RTL scroll sign.
	const middle = (rect: DOMRect) => horizontal ? rect.left + rect.width / 2 : rect.top + rect.height / 2

	const syncScrollability = () => {
		canScrollPrev = Boolean(count) && (loop || selected > 0)
		canScrollNext = Boolean(count) && (loop || selected < count - 1)
	}

	const sync = () => {
		const nodes = items()
		const previousSelected = selected
		const previousCount = count
		const previousCanScrollPrev = canScrollPrev
		const previousCanScrollNext = canScrollNext
		count = nodes.length
		selected = 0

		if (viewport && count) {
			const center = middle(viewport.getBoundingClientRect())
			let distance = Number.POSITIVE_INFINITY

			nodes.forEach((item, index) => {
				const next = Math.abs(middle(item.getBoundingClientRect()) - center)
				if (next < distance) {
					distance = next
					selected = index
				}
			})
		}
		syncScrollability()

		return previousSelected !== selected
			|| previousCount !== count
			|| previousCanScrollPrev !== canScrollPrev
			|| previousCanScrollNext !== canScrollNext
	}
	const invalidate = () => {
		if (sync()) this.next()
	}

	const scroll = scrolling(this, {
		target: () => viewport,
		onScroll: invalidate,
	})

	const size = resize(this, {
		target: () => viewport,
		onResize: invalidate,
	})

	const scrollTo = (index: number) => {
		const nodes = items()
		if (!nodes.length) return
		nodes[clamp(index, 0, nodes.length - 1)]?.scrollIntoView({
			behavior: 'smooth',
			block: horizontal ? 'nearest' : 'start',
			inline: horizontal ? 'start' : 'nearest',
		})
	}

	const scrollPrev = () => {
		if (!count) return
		scrollTo(selected <= 0 && loop ? count - 1 : selected - 1)
	}

	const scrollNext = () => {
		if (!count) return
		scrollTo(selected >= count - 1 && loop ? 0 : selected + 1)
	}

	const setViewport = (element: HTMLElement | null) => {
		if (viewport === element) return

		viewport = element
		scroll.sync()
		size.sync()
		this.next(sync)
	}
	const parts: CarouselPartsContextValue = { setViewport }

	listen(this, 'keydown', (event: KeyboardEvent) => {
		const [back, forward] = !horizontal
			? ['ArrowUp', 'ArrowDown']
			: dir === 'rtl' ? ['ArrowRight', 'ArrowLeft'] : ['ArrowLeft', 'ArrowRight']
		if (event.key !== back && event.key !== forward) return
		event.preventDefault()
		if (event.key === back) scrollPrev()
		else scrollNext()
	})

	for (const { children, dir: nextDir, loop: nextLoop, orientation } of this) {
		dir = nextDir
		horizontal = orientation === 'horizontal'
		loop = nextLoop
		syncScrollability()

		scroll.sync()
		size.sync()

		CarouselContext({
			canScrollNext,
			canScrollPrev,
			count,
			orientation,
			scrollNext,
			scrollPrev,
			scrollTo,
			selected,
		})
		CarouselPartsContext(parts)

		yield <>{children}</>
	}
}

/** Unstyled native scroll-snap carousel root. */
const Carousel: Stateless<CarouselArgs> = ({
	children,
	dir,
	loop = false,
	orientation = 'horizontal',
	role = 'region',
	...attrs
}) => {
	const resolvedDir = dir ?? DirectionContext()

	return (
		<CarouselRoot
			{...rootAttrs(attrs)}
			dir={resolvedDir}
			loop={loop}
			orientation={orientation}
			attr:aria-roledescription="carousel"
			attr:data-axis={orientation === 'horizontal' ? 'x' : 'y'}
			attr:data-slot="carousel"
			attr:dir={resolvedDir}
			attr:role={role}
		>
			{children}
		</CarouselRoot>
	)
}

/** Unstyled scroll viewport and track for carousel slides. */
const CarouselContent: Stateless<CarouselContentArgs> = ({
	children,
	...attrs
}) => {
	const state = carousel()
	const parts = carouselParts()

	return (
		<div data-slot="carousel-content">
			<div
				{...attrs}
				data-axis={state.orientation === 'horizontal' ? 'x' : 'y'}
				data-slot="carousel-track"
				ref={parts.setViewport}
			>
				{children}
			</div>
		</div>
	)
}

/** Unstyled carousel slide item. */
const CarouselItem: Stateless<CarouselItemArgs> = ({
	children,
	role = 'group',
	...attrs
}) => (
	<div
		{...attrs}
		aria-roledescription="slide"
		data-slot="carousel-item"
		role={role}
	>
		{children}
	</div>
)

const carouselButton = (step: 'previous' | 'next'): Stateless<CarouselButtonArgs> => ({
	children,
	'aria-label': label = step === 'next' ? 'Next slide' : 'Previous slide',
	disabled,
	type = 'button',
	'set:onclick': onClick,
	...attrs
}) => {
	const state = carousel()
	const available = step === 'next' ? state.canScrollNext : state.canScrollPrev
	const click = (event: MouseEvent) => {
		callHandler(onClick, event)
		if (event.defaultPrevented || disabled || !available) return
		if (step === 'next') state.scrollNext()
		else state.scrollPrev()
	}

	return (
		<button
			{...attrs}
			aria-label={label}
			data-slot={`carousel-${step}`}
			disabled={disabled || !available}
			set:onclick={click}
			type={type}
		>
			{children}
		</button>
	)
}

/** Unstyled previous slide button. */
const CarouselPrevious = carouselButton('previous')

/** Unstyled next slide button. */
const CarouselNext = carouselButton('next')

export {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
}
