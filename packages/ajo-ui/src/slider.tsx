import type { IntrinsicElements, Stateful, Stateless } from 'ajo'
import { callHandler, clamp, controlled, listen, move } from 'ajo-cloves'
import { FieldContext } from './field'
import type { FixedArgs, OmitArg } from './utils'
import { clx, flag, stlx, toNumber } from './utils'

export type SliderOrientation = 'horizontal' | 'vertical'

export type SliderArgs = OmitArg<IntrinsicElements['input'], 'children' | 'defaultValue' | 'type' | 'value'> & {
	/** Controlled slider values. Use one value for a single thumb, multiple values for ranges. */
	value?: number[]
	/** Initial values for uncontrolled usage. */
	defaultValue?: number[]
	/** Lowest allowed value. */
	min?: number
	/** Highest allowed value. */
	max?: number
	/** Value granularity. */
	step?: number | 'any'
	/** Minimum distance, in steps, allowed between adjacent thumbs. */
	minStepsBetweenThumbs?: number
	/** Layout orientation. */
	orientation?: SliderOrientation
	/** Reverse the value direction. */
	inverted?: boolean
	/** Called whenever the value changes. */
	onValueChange?: (value: number[], event: Event) => void
	/** Called when an input change is committed. */
	onValueCommit?: (value: number[], event: Event) => void
	/** Classes for the native range inputs. */
	inputClass?: string
	/** Classes for the range fill element. */
	rangeClass?: string
	/** Classes for the thumb elements. */
	thumbClass?: string
	/** Classes for the track element. */
	trackClass?: string
	/** Extra input classes applied only in vertical orientation. */
	verticalInputClass?: string
} & FixedArgs<'children' | 'type'>

type SliderRootArgs = OmitArg<SliderArgs, 'class' | 'inputClass' | 'rangeClass' | 'thumbClass' | 'trackClass' | 'verticalInputClass'> & {
	inputAttrs: Record<string, unknown>
	inputClass?: string
	inputOnChange?: unknown
	inputOnInput?: unknown
	rangeClass?: string
	thumbClass?: string
	trackClass?: string
	verticalInputClass?: string
} & FixedArgs<'class'>

type ValueCallback = (value: number[], event: Event) => void

type Runtime = {
	disabled: boolean
	inputs: Array<HTMLInputElement | null>
	inverted: boolean
	max: number
	min: number
	minStepsBetweenThumbs: number
	onValueChange?: ValueCallback
	onValueCommit?: ValueCallback
	orientation: SliderOrientation
	step?: number | 'any'
	values: number[]
}

const sliderStep = (value: unknown): number | 'any' | undefined =>
	value === 'any' ? 'any' : toNumber(value ?? 1, 1)

const sliderOrientation = (value: unknown): SliderOrientation =>
	value === 'vertical' ? 'vertical' : 'horizontal'

const valueCallback = (value: unknown): ValueCallback | undefined =>
	typeof value === 'function' ? value as ValueCallback : undefined

const percent = (value: number, min: number, max: number, inverted: boolean) => {
	if (max <= min) return 0
	const raw = clamp(((value - min) / (max - min)) * 100, 0, 100)
	return inverted ? 100 - raw : raw
}

const precision = (value: number) => {
	const match = String(value).match(/\.(\d+)/)
	return match ? match[1].length : 0
}

const snap = (value: number, min: number, step: number | 'any' | undefined) => {
	if (step === 'any' || step == null) return value
	const amount = Number(step)
	if (!Number.isFinite(amount) || amount <= 0) return value
	const places = Math.max(precision(min), precision(amount))
	const next = min + Math.round((value - min) / amount) * amount
	return Number(next.toFixed(places + 2))
}

const valuesFrom = (
	value: unknown,
	min: number,
	max: number,
	step: number | 'any' | undefined,
	minStepsBetweenThumbs = 0,
) => {
	const raw = Array.isArray(value) && value.length
		? value.map(item => toNumber(item, min))
		: [min]
	const gapStep = step === 'any' ? 0 : toNumber(step ?? 1, 1)
	const gap = Math.max(0, minStepsBetweenThumbs) * Math.max(0, gapStep)
	const next = raw
		.map(item => snap(clamp(item, min, max), min, step))
		.sort((a, b) => a - b)

	for (let index = 0; index < next.length; index++) {
		const lower = index > 0 ? next[index - 1] + gap : min
		next[index] = clamp(next[index], lower, max)
	}

	for (let index = next.length - 1; index >= 0; index--) {
		const upper = index < next.length - 1 ? next[index + 1] - gap : max
		next[index] = clamp(next[index], min, upper)
	}

	return next
}

const sameValues = (first: number[], second: number[]) =>
	first.length === second.length && first.every((value, index) => value === second[index])

const replaceValue = (runtime: Runtime, index: number, value: number) => {
	const next = [...runtime.values]
	const gapStep = runtime.step === 'any' ? 0 : toNumber(runtime.step ?? 1, 1)
	const gap = Math.max(0, runtime.minStepsBetweenThumbs) * Math.max(0, gapStep)
	const lower = index > 0 ? next[index - 1] + gap : runtime.min
	const upper = index < next.length - 1 ? next[index + 1] - gap : runtime.max
	next[index] = snap(clamp(value, lower, upper), runtime.min, runtime.step)
	return next
}

const closestThumb = (runtime: Runtime, value: number) => {
	let nearest = 0
	let distance = Number.POSITIVE_INFINITY

	for (let index = 0; index < runtime.values.length; index++) {
		const next = Math.abs(runtime.values[index] - value)
		if (next < distance) {
			nearest = index
			distance = next
		}
	}

	return nearest
}

const pointerValue = (element: HTMLElement, runtime: Runtime, event: PointerEvent) => {
	const rect = element.getBoundingClientRect()
	const distance = runtime.orientation === 'vertical'
		? rect.bottom - event.clientY
		: event.clientX - rect.left
	const size = runtime.orientation === 'vertical' ? rect.height : rect.width
	const raw = size > 0 ? clamp(distance / size, 0, 1) : 0
	const ratio = runtime.inverted ? 1 - raw : raw
	return runtime.min + ratio * (runtime.max - runtime.min)
}

const rangeStyle = (orientation: SliderOrientation, start: number, end: number) =>
	orientation === 'vertical'
		? stlx({ bottom: `${start}%`, height: `${Math.max(0, end - start)}%` })
		: stlx({ left: `${start}%`, width: `${Math.max(0, end - start)}%` })

const thumbStyle = (orientation: SliderOrientation, position: number) =>
	orientation === 'vertical'
		? stlx({ bottom: `${position}%`, left: '50%', transform: 'translate(-50%, 50%)' })
		: stlx({ left: `${position}%`, top: '50%', transform: 'translate(-50%, -50%)' })

const inputId = (id: unknown, index: number, total: number) => {
	if (id == null) return undefined
	const value = String(id)
	return total === 1 ? value : `${value}-${index + 1}`
}

const inputLabel = (label: unknown, index: number, total: number) => {
	if (label == null) return total === 1 ? 'Slider' : `Slider thumb ${index + 1}`
	const value = String(label)
	return total === 1 ? value : `${value} ${index + 1}`
}

const SliderRoot: Stateful<SliderRootArgs, 'span'> = function* ({ defaultValue, max = 100, min = 0, step = 1, value }) {
	const initialMin = toNumber(min, 0)
	const initialMax = toNumber(max, 100)
	const initialStep = sliderStep(step)
	const initial = valuesFrom(value ?? defaultValue, initialMin, initialMax, initialStep, 0)
	let runtime: Runtime = {
		disabled: false,
		inputs: [],
		inverted: false,
		max: initialMax,
		min: initialMin,
		minStepsBetweenThumbs: 0,
		orientation: 'horizontal',
		step: initialStep,
		values: initial,
	}
	const state = controlled<number[]>(this, {
		fallback: initial,
		onChange: (next, event) => runtime.onValueChange?.(next, event as Event),
	})

	const commit = (event: Event) => runtime.onValueCommit?.(runtime.values, event)

	const update = (index: number, raw: number, event: Event) => {
		const next = replaceValue(runtime, index, raw)
		if (sameValues(next, runtime.values)) return

		runtime.values = next
		state.set(next, event)
	}

	let dragIndex = 0
	const drag = move(this, {
		onMove: (_data, event) => update(dragIndex, pointerValue(this, runtime, event), event),
		onEnd: (_data, event) => commit(event as Event),
	})

	listen(this, 'pointerdown', (event: PointerEvent) => {
		if (runtime.disabled || event.button !== 0) return

		const raw = pointerValue(this, runtime, event)
		const index = closestThumb(runtime, raw)
		dragIndex = index
		runtime.inputs[index]?.focus()
		update(index, raw, event)
		event.preventDefault()
		drag.start(event)
	})

	for (const {
		disabled,
		inputAttrs,
		inputClass,
		inputOnChange,
		inputOnInput,
		inverted,
		max = 100,
		min = 0,
		minStepsBetweenThumbs = 0,
		onValueChange,
		onValueCommit,
		orientation = 'horizontal',
		rangeClass,
		step = 1,
		thumbClass,
		trackClass,
		value,
		verticalInputClass,
	} of this) {
		const minValue = toNumber(min, 0)
		const maxValue = toNumber(max, 100)
		const stepValue = sliderStep(step)
		const gapValue = toNumber(minStepsBetweenThumbs, 0)
		const orientationValue = sliderOrientation(orientation)
		const raw = state.sync(value != null ? value as number[] : undefined)
		const values = valuesFrom(raw, minValue, maxValue, stepValue, gapValue)
		if (!state.controlled && !sameValues(values, raw)) state.init(values)

		runtime = {
			disabled: Boolean(disabled),
			inputs: runtime.inputs,
			inverted: Boolean(inverted),
			max: maxValue,
			min: minValue,
			minStepsBetweenThumbs: gapValue,
			onValueChange: valueCallback(onValueChange),
			onValueCommit: valueCallback(onValueCommit),
			orientation: orientationValue,
			step: stepValue,
			values,
		}
		runtime.inputs.length = values.length

		const positions = values.map(item => percent(item, minValue, maxValue, runtime.inverted))
		const start = values.length > 1 ? Math.min(...positions) : 0
		const end = values.length > 1 ? Math.max(...positions) : positions[0] ?? 0
		const disabledFlag = disabled ? true : undefined

		yield (
			<>
				<span
					class={trackClass}
					data-orientation={orientationValue}
					data-slot="slider-track"
				>
					<span
						class={rangeClass}
						data-orientation={orientationValue}
						data-slot="slider-range"
						style={rangeStyle(orientationValue, start, end)}
					/>
				</span>
				{values.map((item, index) => {
					const handleInput = (event: Event) => {
						callHandler(inputOnInput, event)
						update(index, (event.currentTarget as HTMLInputElement).valueAsNumber, event)
					}
					const handleChange = (event: Event) => {
						callHandler(inputOnChange, event)
						commit(event)
					}

					return (
						<input
							key={`slider-input-${index}`}
							{...inputAttrs}
							aria-label={inputLabel(inputAttrs['aria-label'], index, values.length)}
							aria-orientation={orientationValue}
							class={clx(inputClass, orientationValue === 'vertical' && verticalInputClass)}
							data-orientation={orientationValue}
							data-slot="slider-input"
							disabled={disabledFlag}
							id={inputId(inputAttrs.id, index, values.length)}
							max={maxValue}
							min={minValue}
							ref={element => runtime.inputs[index] = element}
							set:onchange={handleChange}
							set:oninput={handleInput}
							set:value={String(item)}
							step={stepValue}
							type="range"
							value={item}
						/>
					)
				})}
				{positions.map((item, index) => (
					<span
						aria-hidden="true"
						class={thumbClass}
						data-index={index}
						data-orientation={orientationValue}
						data-slot="slider-thumb"
						key={`slider-thumb-${index}`}
						style={thumbStyle(orientationValue, item)}
					/>
				))}
			</>
		)
	}
}

SliderRoot.is = 'span'

/** Unstyled range slider with native range inputs and pointer behavior. */
const Slider: Stateless<SliderArgs> = ({
	class: classes,
	defaultValue,
	disabled,
	inputClass,
	inverted,
	max = 100,
	min = 0,
	minStepsBetweenThumbs,
	onValueChange,
	onValueCommit,
	orientation = 'horizontal',
	rangeClass,
	'set:onchange': inputOnChange,
	'set:oninput': inputOnInput,
	step = 1,
	thumbClass,
	trackClass,
	type: _type,
	value,
	verticalInputClass,
	...inputAttrs
}) => {
	const disabledFlag = disabled ? true : undefined
	const preview = valuesFrom(
		value ?? defaultValue,
		toNumber(min, 0),
		toNumber(max, 100),
		sliderStep(step),
		toNumber(minStepsBetweenThumbs, 0),
	)
	const field = FieldContext()
	const groupAttrs = field && preview.length > 1 ? field.groupAttrs : undefined
	const controlAttrs = field && preview.length === 1 ? field.controlAttrs : undefined
	const effectiveInputAttrs = controlAttrs ? { ...controlAttrs, ...inputAttrs } : inputAttrs

	return (
		<SliderRoot
			defaultValue={defaultValue}
			disabled={disabledFlag}
			inputAttrs={effectiveInputAttrs}
			inputClass={inputClass}
			inputOnChange={inputOnChange}
			inputOnInput={inputOnInput}
			inverted={inverted}
			max={max}
			min={min}
			minStepsBetweenThumbs={minStepsBetweenThumbs}
			onValueChange={onValueChange}
			onValueCommit={onValueCommit}
			orientation={orientation}
			rangeClass={rangeClass}
			step={step}
			thumbClass={thumbClass}
			trackClass={trackClass}
			value={value}
			verticalInputClass={verticalInputClass}
			attr:aria-describedby={groupAttrs?.['aria-describedby']}
			attr:aria-labelledby={groupAttrs?.['aria-labelledby']}
			attr:aria-disabled={flag(disabled)}
			attr:class={classes}
			attr:data-disabled={flag(disabled)}
			attr:data-inverted={flag(inverted)}
			attr:data-orientation={orientation}
			attr:data-slot="slider"
			attr:role={groupAttrs ? 'group' : undefined}
		/>
	)
}

export { Slider }
