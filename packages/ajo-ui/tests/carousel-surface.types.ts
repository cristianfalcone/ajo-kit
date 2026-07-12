import type { CarouselOptions } from '../src/carousel'

export const carouselOptions = {
	axis: 'x',
	direction: 'ltr',
	loop: true,
} satisfies CarouselOptions

// @ts-expect-error Alignment is not public until implemented end-to-end.
export const removedCarouselAlign = { align: 'start' } satisfies CarouselOptions
