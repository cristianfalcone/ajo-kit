import type { Stateless } from 'ajo'
import clsx from 'clsx'
import type { FixedArgs, OmitArg } from 'ajo-ui/utils'
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
export type { CarouselApi, CarouselContextValue, CarouselDirection, CarouselEvent, CarouselOptions, CarouselOrientation } from 'ajo-ui/carousel'

export type CarouselArgs = BaseCarouselArgs & {
	/** Additional UnoCSS classes. */
	class?: string
}

export type CarouselContentArgs = OmitArg<BaseCarouselContentArgs, 'viewportClass'> & FixedArgs<'viewportClass'> & {
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

const carousel = () => {
	const value = CarouselContext()
	if (!value) throw new Error('Carousel parts must be used within a <Carousel />')
	return value
}

/** Native scroll-snap carousel root. */
const Carousel: Stateless<CarouselArgs> = ({
	children,
	class: classes,
	dir,
	opts,
	orientation,
	role = 'region',
	setApi,
	...attrs
}) => (
	<BaseCarousel
		{...attrs}
		class={clsx('relative', classes)}
		dir={dir}
		opts={opts}
		orientation={orientation}
		role={role}
		setApi={setApi}
	>
		{children}
	</BaseCarousel>
)

/** Scroll viewport and track for carousel slides. */
const CarouselContent: Stateless<CarouselContentArgs> = ({
	children,
	class: classes,
	...attrs
}) => {
	const state = carousel()
	const horizontal = state.orientation === 'horizontal'

	return (
		<BaseCarouselContent
			{...attrs}
			class={clsx(
				'flex scroll-smooth overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
				horizontal
					? '-ml-4 overflow-x-auto snap-x snap-mandatory'
					: '-mt-4 max-h-full flex-col overflow-y-auto snap-y snap-mandatory',
				classes,
			)}
			viewportClass="overflow-hidden"
		>
			{children}
		</BaseCarouselContent>
	)
}

/** Carousel slide item. */
const CarouselItem: Stateless<CarouselItemArgs> = ({
	children,
	class: classes,
	role = 'group',
	...attrs
}) => {
	const { orientation } = carousel()

	return (
		<BaseCarouselItem
			{...attrs}
			class={clsx(
				'min-w-0 shrink-0 grow-0 basis-full snap-start',
				orientation === 'horizontal' ? 'pl-4' : 'pt-4',
				classes,
			)}
			role={role}
		>
			{children}
		</BaseCarouselItem>
	)
}

/** Previous slide button. */
const CarouselPrevious: Stateless<CarouselButtonArgs> = ({
	'aria-label': label = 'Previous slide',
	class: classes,
	disabled,
	type = 'button',
	variant = 'outline',
	...attrs
}) => {
	const { orientation } = carousel()

	return (
		<BaseCarouselPrevious
			{...attrs}
			aria-label={label}
			class={clsx(
				buttonVariants({ size: 'none', variant }),
				'absolute size-8 rounded-full',
				orientation === 'horizontal'
					? 'top-1/2 -left-12 -translate-y-1/2'
					: '-top-12 left-1/2 -translate-x-1/2 rotate-90',
				classes,
			)}
			disabled={disabled}
			type={type}
		>
			<span aria-hidden="true" class="i-lucide-arrow-left size-4" />
			<span class="sr-only">{label}</span>
		</BaseCarouselPrevious>
	)
}

/** Next slide button. */
const CarouselNext: Stateless<CarouselButtonArgs> = ({
	'aria-label': label = 'Next slide',
	class: classes,
	disabled,
	type = 'button',
	variant = 'outline',
	...attrs
}) => {
	const { orientation } = carousel()

	return (
		<BaseCarouselNext
			{...attrs}
			aria-label={label}
			class={clsx(
				buttonVariants({ size: 'none', variant }),
				'absolute size-8 rounded-full',
				orientation === 'horizontal'
					? 'top-1/2 -right-12 -translate-y-1/2'
					: '-bottom-12 left-1/2 -translate-x-1/2 rotate-90',
				classes,
			)}
			disabled={disabled}
			type={type}
		>
			<span aria-hidden="true" class="i-lucide-arrow-right size-4" />
			<span class="sr-only">{label}</span>
		</BaseCarouselNext>
	)
}

export {
	Carousel,
	CarouselContext,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
}
