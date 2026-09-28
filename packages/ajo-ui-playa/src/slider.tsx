import type { Stateless } from 'ajo'
import { clx, type FixedArgs, type OmitArg } from 'ajo-ui/utils'
import {
	Slider as BaseSlider,
	type SliderArgs as BaseSliderArgs,
	type SliderOrientation,
} from 'ajo-ui/slider'
export type { SliderOrientation } from 'ajo-ui/slider'

export type SliderArgs = OmitArg<
	BaseSliderArgs,
	'inputClass' | 'rangeClass' | 'thumbClass' | 'trackClass'
> & FixedArgs<'inputClass' | 'rangeClass' | 'thumbClass' | 'trackClass'> & { class?: string }

// The track is a neutral groove and the range the ink (D28); the thumb is
// ivory like an off switch's (it is not a state mark), and only the focused
// one wears the ring.
const rootBase = 'playa-slider group/slider relative flex touch-none cursor-pointer select-none items-center outline-none'
const rootOrientation: Record<SliderOrientation, string> = {
	horizontal: 'h-5 w-full',
	vertical: 'h-44 min-h-44 w-5 flex-col',
}
const trackBase = 'relative grow overflow-hidden rounded-full bg-muted edge-input group-has-[[aria-invalid=true]]/slider:inset-ring-danger'
const trackOrientation: Record<SliderOrientation, string> = {
	horizontal: 'h-1.5 w-full',
	vertical: 'h-full w-1.5',
}
const rangeBase = 'absolute bg-ink forced-colors:forced-color-adjust-none forced-colors:bg-[CanvasText]'
const rangeOrientation: Record<SliderOrientation, string> = {
	horizontal: 'h-full',
	vertical: 'w-full',
}
const thumbBase = 'playa-thumb absolute z-10 block size-4'
const inputBase = 'pointer-events-none absolute inset-0 z-20 m-0 size-full appearance-none opacity-0'

/** Range slider with component styling, native range inputs, and Ajo state. */
const Slider: Stateless<SliderArgs> = ({ class: classes, orientation = 'horizontal', ...attrs }) => (
	<BaseSlider
		{...attrs}
		inputClass={clx(inputBase, orientation === 'vertical' && '[writing-mode:vertical-lr]')}
		orientation={orientation}
		rangeClass={clx(rangeBase, rangeOrientation[orientation])}
		thumbClass={thumbBase}
		trackClass={clx(trackBase, trackOrientation[orientation])}
		class={clx(rootBase, rootOrientation[orientation], attrs.disabled ? 'cursor-not-allowed opacity-[var(--disabled-opacity)]' : undefined, classes)}
	/>
)

export { Slider }
