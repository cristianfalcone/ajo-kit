import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { callHandler, clamp, listen, resize, scrolling, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'

/** Layout axis used by a Carousel. */
export type CarouselOrientation =
	| 'horizontal'
	| 'vertical'

/** Inline direction used by horizontal Carousel navigation. */
export type CarouselDirection =
	| 'ltr'
	| 'rtl'

/** Behavioral options for the native Carousel controller. */
export type CarouselOptions = {
	/** Axis hint for carousel options. */
	axis?: 'x' | 'y'
	/** Text direction hint for localized carousels. */
	direction?: CarouselDirection
	/** Loop prev/next navigation at the ends. */
	loop?: boolean
}

/** Lifecycle events emitted by a Carousel controller. */
export type CarouselEvent =
	| 'reInit'
	| 'select'

/** Imperative view of the current Carousel position and controls. */
export type CarouselApi = {
	canScrollNext: () => boolean
	canScrollPrev: () => boolean
	off: (event: CarouselEvent, listener: () => void) => void
	on: (event: CarouselEvent, listener: () => void) => void
	reInit: () => void
	scrollNext: () => void
	scrollPrev: () => void
	scrollSnapList: () => number[]
	scrollTo: (index: number) => void
	selectedScrollSnap: () => number
}

/** Arguments for the Carousel root. */
export type CarouselArgs = WithChildren<IntrinsicElements['div'] & {
	/** Orientation of the carousel track. */
	orientation?: CarouselOrientation
	/** Native carousel options. */
	opts?: CarouselOptions
	/** Receives the small native carousel controller. */
	setApi?: (api: CarouselApi) => void
}>

/** Arguments for the Carousel track and viewport composition. */
export type CarouselContentArgs = WithChildren<IntrinsicElements['div'] & {
	/** Classes for the viewport wrapper. */
	viewportClass?: string
}>

/** Arguments for one snap-aligned Carousel item. */
export type CarouselItemArgs = WithChildren<IntrinsicElements['div']>

/** Shared arguments for previous and next Carousel buttons. */
export type CarouselButtonArgs = WithChildren<IntrinsicElements['button']>

type CarouselContextValue = {
	canScrollNext: boolean
	canScrollPrev: boolean
	count: number
	orientation: CarouselOrientation
	scrollNext: () => void
	scrollPrev: () => void
	selected: number
	setViewport: (element: HTMLElement | null) => void
}

const CarouselContext = context<CarouselContextValue | null>(null)

const axis = (orientation: CarouselOrientation) =>
	orientation === 'horizontal' ? 'x' : 'y'

const alignBlock = (orientation: CarouselOrientation) =>
	orientation === 'vertical' ? 'start' : 'nearest'

const alignInline = (orientation: CarouselOrientation) =>
	orientation === 'horizontal' ? 'start' : 'nearest'

const itemPosition = (item: HTMLElement, orientation: CarouselOrientation) =>
	orientation === 'horizontal' ? item.offsetLeft : item.offsetTop

const viewportPosition = (viewport: HTMLElement, orientation: CarouselOrientation) =>
	orientation === 'horizontal' ? viewport.scrollLeft : viewport.scrollTop

const viewportSize = (viewport: HTMLElement, orientation: CarouselOrientation) =>
	orientation === 'horizontal' ? viewport.clientWidth : viewport.clientHeight

const itemSize = (item: HTMLElement, orientation: CarouselOrientation) =>
	orientation === 'horizontal' ? item.offsetWidth : item.offsetHeight

const CarouselRoot: Stateful<Pick<CarouselArgs, 'children' | 'opts' | 'orientation' | 'setApi'>> = function* () {
	let viewport: HTMLElement | null = null
	let orientation: CarouselOrientation = 'horizontal'
	let loop = false
	let selected = 0
	let count = 0
	let canScrollPrev = false
	let canScrollNext = false
	let apiReceiver: CarouselArgs['setApi']
	const listeners = new Map<CarouselEvent, Set<() => void>>()

	const items = () => viewport
		? Array.from(viewport.querySelectorAll<HTMLElement>('[data-slot="carousel-item"]'))
		: []

	const emit = (event: CarouselEvent) => {
		for (const listener of listeners.get(event) ?? []) listener()
	}

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

		if (!viewport || !count) {
			selected = 0
		} else {
			const center = viewportPosition(viewport, orientation) + viewportSize(viewport, orientation) / 2
			let nextSelected = 0
			let distance = Number.POSITIVE_INFINITY

			nodes.forEach((item, index) => {
				const next = Math.abs(itemPosition(item, orientation) + itemSize(item, orientation) / 2 - center)
				if (next < distance) {
					distance = next
					nextSelected = index
				}
			})

			selected = nextSelected
		}
		syncScrollability()

		const changed = previousSelected !== selected
			|| previousCount !== count
			|| previousCanScrollPrev !== canScrollPrev
			|| previousCanScrollNext !== canScrollNext
		if (previousCount !== count) emit('reInit')
		if (previousSelected !== selected) emit('select')

		return changed
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
		const target = clamp(index, 0, nodes.length - 1)
		nodes[target]?.scrollIntoView({
			behavior: 'smooth',
			block: alignBlock(orientation),
			inline: alignInline(orientation),
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

	const api: CarouselApi = {
		canScrollNext: () => canScrollNext,
		canScrollPrev: () => canScrollPrev,
		off: (event, listener) => listeners.get(event)?.delete(listener),
		on: (event, listener) => {
			const set = listeners.get(event) ?? new Set()
			set.add(listener)
			listeners.set(event, set)
		},
		reInit: () => {
			this.next(sync)
		},
		scrollNext,
		scrollPrev,
		scrollSnapList: () => items().map((_, index) => index),
		scrollTo,
		selectedScrollSnap: () => selected,
	}

	const setViewport = (element: HTMLElement | null) => {
		if (viewport === element) return

		viewport = element
		scroll.sync()
		size.sync()
		this.next(sync)
	}

	const keydown = (event: KeyboardEvent) => {
		if (orientation === 'horizontal') {
			if (event.key === 'ArrowLeft') {
				event.preventDefault()
				scrollPrev()
			} else if (event.key === 'ArrowRight') {
				event.preventDefault()
				scrollNext()
			}
		} else if (event.key === 'ArrowUp') {
			event.preventDefault()
			scrollPrev()
		} else if (event.key === 'ArrowDown') {
			event.preventDefault()
			scrollNext()
		}
	}

	listen(this, 'keydown', keydown)

	for (const {
		children,
		opts,
		orientation: nextOrientation,
		setApi,
	} of this) {
		orientation = nextOrientation ?? (opts?.axis === 'y' ? 'vertical' : 'horizontal')
		loop = Boolean(opts?.loop)
		syncScrollability()
		if (setApi && setApi !== apiReceiver) {
			apiReceiver = setApi
			setApi(api)
		}

		scroll.sync()
		size.sync()

		CarouselContext({
			canScrollNext,
			canScrollPrev,
			count,
			orientation,
			scrollNext,
			scrollPrev,
			selected,
			setViewport,
		})

		yield <>{children}</>
	}
}


/** Return the current unstyled carousel context. */
const useCarousel = () => {
	const value = CarouselContext()
	if (!value) throw new Error('useCarousel must be used within a <Carousel />')
	return value
}

/** Unstyled native scroll-snap carousel root. */
const Carousel: Stateless<CarouselArgs> = ({
	children,
	dir,
	opts,
	orientation,
	role = 'region',
	setApi,
	...attrs
}) => (
	<CarouselRoot
		{...rootAttrs(attrs as Record<string, unknown>)}
		opts={opts}
		orientation={orientation}
		setApi={setApi}
		attr:aria-roledescription="carousel"
		attr:data-axis={axis(orientation ?? (opts?.axis === 'y' ? 'vertical' : 'horizontal'))}
		attr:data-slot="carousel"
		attr:dir={opts?.direction ?? dir}
		attr:role={role}
	>
		{children}
	</CarouselRoot>
)

/** Unstyled scroll viewport and track for carousel slides. */
const CarouselContent: Stateless<CarouselContentArgs> = ({
	children,
	viewportClass,
	...attrs
}) => {
	const carousel = useCarousel()

	return (
		<div class={viewportClass} data-slot="carousel-content">
			<div
				{...attrs}
				data-axis={axis(carousel.orientation)}
				data-slot="carousel-track"
				ref={carousel.setViewport}
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

/** Unstyled previous slide button. */
const CarouselPrevious: Stateless<CarouselButtonArgs> = ({
	children,
	'aria-label': label = 'Previous slide',
	disabled,
	type = 'button',
	'set:onclick': onClick,
	...attrs
}) => {
	const { canScrollPrev, scrollPrev } = useCarousel()
	const click = (event: MouseEvent) => {
		callHandler(onClick, event)
		if (event.defaultPrevented || disabled || !canScrollPrev) return
		scrollPrev()
	}

	return (
		<button
			{...attrs}
			aria-label={label}
			data-slot="carousel-previous"
			disabled={disabled || !canScrollPrev}
			set:onclick={click}
			type={type}
		>
			{children}
		</button>
	)
}

/** Unstyled next slide button. */
const CarouselNext: Stateless<CarouselButtonArgs> = ({
	children,
	'aria-label': label = 'Next slide',
	disabled,
	type = 'button',
	'set:onclick': onClick,
	...attrs
}) => {
	const { canScrollNext, scrollNext } = useCarousel()
	const click = (event: MouseEvent) => {
		callHandler(onClick, event)
		if (event.defaultPrevented || disabled || !canScrollNext) return
		scrollNext()
	}

	return (
		<button
			{...attrs}
			aria-label={label}
			data-slot="carousel-next"
			disabled={disabled || !canScrollNext}
			set:onclick={click}
			type={type}
		>
			{children}
		</button>
	)
}

export {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
	useCarousel,
}
