import type { Stateless } from 'ajo'
import { clx, type FixedArgs, type OmitArg } from 'ajo-ui/utils'
import {
	Slider as BaseSlider,
	type SliderArgs as BaseSliderArgs,
	type SliderOrientation as BaseSliderOrientation,
} from 'ajo-ui/slider'

export type SliderOrientation = BaseSliderOrientation
export type SliderArgs = OmitArg<
	BaseSliderArgs,
	'inputClass' | 'rangeClass' | 'thumbClass' | 'trackClass'
> & FixedArgs<'inputClass' | 'rangeClass' | 'thumbClass' | 'trackClass'> & { class?: string }

const rootBase = 'group/slider relative flex touch-none cursor-pointer select-none items-center outline-none has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50'
const rootOrientation: Record<SliderOrientation, string> = {
	horizontal: 'h-5 w-full',
	vertical: 'h-44 min-h-44 w-5 flex-col',
}
const trackBase = 'relative grow overflow-hidden rounded-full bg-primary/20'
const trackOrientation: Record<SliderOrientation, string> = {
	horizontal: 'h-1.5 w-full',
	vertical: 'h-full w-1.5',
}
const rangeBase = 'absolute bg-primary'
const rangeOrientation: Record<SliderOrientation, string> = {
	horizontal: 'h-full',
	vertical: 'w-full',
}
const thumbBase = 'pointer-events-none absolute z-10 block size-4 rounded-full edge-input bg-card ring-ring/50 transition-[color,box-shadow] group-has-[:focus-visible]/slider:ring-4'
const inputBase = 'pointer-events-none absolute inset-0 z-20 m-0 size-full appearance-none opacity-0'

/** Range slider with component styling, native range inputs, and Ajo state. */
const Slider: Stateless<SliderArgs> = ({
	class: classes,
	disabled,
	orientation = 'horizontal',
	...attrs
}) => {
	const disabledFlag = disabled ? true : undefined

	return (
		<BaseSlider
			{...attrs}
			disabled={disabledFlag}
			inputClass={clx(inputBase, orientation === 'vertical' && '[writing-mode:vertical-lr]')}
			orientation={orientation}
			rangeClass={clx(rangeBase, rangeOrientation[orientation])}
			thumbClass={thumbBase}
			trackClass={clx(trackBase, trackOrientation[orientation])}
			class={clx(rootBase, rootOrientation[orientation], disabledFlag && 'cursor-not-allowed opacity-50', classes)}
		/>
	)
}

export { Slider }
