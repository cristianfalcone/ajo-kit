import type { Stateless } from 'ajo'
import { clx, type FixedArgs, type OmitArg } from 'ajo-ui/utils'
import { buttonVariants } from './button'
import type { ButtonVariant } from './button'
import {
	Carousel as BaseCarousel,
	CarouselContext,
	CarouselContent as BaseCarouselContent,
	CarouselItem as BaseCarouselItem,
	CarouselNext as BaseCarouselNext,
	CarouselPrevious as BaseCarouselPrevious,
	type CarouselArgs as BaseCarouselArgs,
	type CarouselButtonArgs as BaseCarouselButtonArgs,
	type CarouselContentArgs as BaseCarouselContentArgs,
	type CarouselItemArgs as BaseCarouselItemArgs,
} from 'ajo-ui/carousel'
export type { CarouselContextValue, CarouselOrientation } from 'ajo-ui/carousel'

export type CarouselArgs = BaseCarouselArgs & {
	/** Additional UnoCSS classes. */
	class?: string
}

export type CarouselContentArgs = BaseCarouselContentArgs & {
	/** Additional UnoCSS classes for the scroll track. */
	class?: string
}

export type CarouselItemArgs = BaseCarouselItemArgs & {
	/** Additional UnoCSS classes. */
	class?: string
}

export type CarouselButtonArgs = OmitArg<BaseCarouselButtonArgs, 'children'> & FixedArgs<'children'> & {
	/** Additional UnoCSS classes. */
	class?: string
	/** Button variant. */
	variant?: ButtonVariant
}

// The base parts report a missing Carousel; the theme only reads the axis.
const horizontal = () => CarouselContext()?.orientation !== 'vertical'

/** Native scroll-snap carousel root. */
const Carousel: Stateless<CarouselArgs> = ({ class: classes, ...attrs }) => (
	<BaseCarousel {...attrs} class={clx('relative [&_[data-slot=carousel-content]]:overflow-hidden', classes)} />
)

/** Scroll viewport and track for carousel slides. */
const CarouselContent: Stateless<CarouselContentArgs> = ({ class: classes, ...attrs }) => (
	<BaseCarouselContent
		{...attrs}
		class={clx(
			'flex scroll-smooth overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
			horizontal()
				? '-ms-4 overflow-x-auto snap-x snap-mandatory'
				: '-mt-4 max-h-full flex-col overflow-y-auto snap-y snap-mandatory',
			classes,
		)}
	/>
)

/** Carousel slide item. */
const CarouselItem: Stateless<CarouselItemArgs> = ({ class: classes, ...attrs }) => (
	<BaseCarouselItem
		{...attrs}
		class={clx('min-w-0 shrink-0 grow-0 basis-full snap-start', horizontal() ? 'ps-4' : 'pt-4', classes)}
	/>
)

const carouselButton = (step: 'previous' | 'next'): Stateless<CarouselButtonArgs> => {
	const next = step === 'next'
	const Base = next ? BaseCarouselNext : BaseCarouselPrevious

	return ({ class: classes, variant = 'outline', ...attrs }) => {
		const inline = horizontal()

		return (
			<Base
				{...attrs}
				class={clx(
					buttonVariants({ size: 'none', variant }),
					'absolute size-8 rounded-full',
					inline ? 'top-1/2 -translate-y-1/2' : 'left-1/2 -translate-x-1/2 rotate-90',
					inline ? (next ? '-end-12' : '-start-12') : (next ? '-bottom-12' : '-top-12'),
					classes,
				)}
			>
				<span aria-hidden="true" class={clx(next ? 'i-lucide-arrow-right' : 'i-lucide-arrow-left', 'size-4', inline && 'rtl:-scale-x-100')} />
			</Base>
		)
	}
}

/** Previous slide button. */
const CarouselPrevious = carouselButton('previous')

/** Next slide button. */
const CarouselNext = carouselButton('next')

export {
	Carousel,
	CarouselContext,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
}
