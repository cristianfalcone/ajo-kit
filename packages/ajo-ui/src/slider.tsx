import type { IntrinsicElements, Stateful, Stateless } from 'ajo'
import { callHandler, clamp, controlled, listen, move } from 'ajo-cloves'
import { FieldContext } from './field'
import { flag } from './shared'
import { type FixedArgs, type OmitArg, stlx } from './utils'

/** Axis along which slider values increase. */
export type SliderOrientation = 'horizontal' | 'vertical'

/** Props for a single- or multi-thumb range slider. */
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
} & FixedArgs<'children' | 'type'>

type SliderRootArgs = OmitArg<SliderArgs, 'class' | 'inputClass' | 'rangeClass' | 'thumbClass' | 'trackClass'> & {
	inputAttrs: Record<string, unknown>
	inputClass?: string
	inputOnChange?: unknown
	inputOnInput?: unknown
	rangeClass?: string
	thumbClass?: string
	trackClass?: string
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
	step: number | 'any'
	values: number[]
}

const percent = (value: number, min: number, max: number, inverted: boolean) => {
	if (max <= min) return 0
	const raw = clamp(((value - min) / (max - min)) * 100, 0, 100)
	return inverted ? 100 - raw : raw
}

const precision = (value: number) => {
	const match = String(value).match(/\.(\d+)/)
	return match ? match[1].length : 0
}

const snap = (value: number, min: number, step: number | 'any') => {
	if (step === 'any') return value
	const amount = Number(step)
	if (!Number.isFinite(amount) || amount <= 0) return value
	const places = Math.max(precision(min), precision(amount))
	const next = min + Math.round((value - min) / amount) * amount
	return Number(next.toFixed(places + 2))
}

/** Distance kept between adjacent thumbs. */
const spacing = (steps: number, step: number | 'any') => step === 'any' ? 0 : steps * step

const valuesFrom = (
	value: number[] | undefined,
	min: number,
	max: number,
	step: number | 'any',
	minStepsBetweenThumbs: number,
) => {
	const gap = spacing(minStepsBetweenThumbs, step)
	const next = (value?.length ? value : [min])
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
	const gap = spacing(runtime.minStepsBetweenThumbs, runtime.step)
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
	const initial = valuesFrom(value ?? defaultValue, min, max, step, 0)
	let runtime: Runtime = {
		disabled: false,
		inputs: [],
		inverted: false,
		max,
		min,
		minStepsBetweenThumbs: 0,
		orientation: 'horizontal',
		step,
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
	} of this) {
		const raw = state.sync(value)
		const values = valuesFrom(raw, min, max, step, minStepsBetweenThumbs)
		if (!state.controlled && !sameValues(values, raw)) state.init(values)

		runtime = {
			disabled: Boolean(disabled),
			inputs: runtime.inputs,
			inverted: Boolean(inverted),
			max,
			min,
			minStepsBetweenThumbs,
			onValueChange,
			onValueCommit,
			orientation,
			step,
			values,
		}
		runtime.inputs.length = values.length

		const positions = values.map(item => percent(item, min, max, runtime.inverted))
		const start = values.length > 1 ? Math.min(...positions) : 0
		const end = values.length > 1 ? Math.max(...positions) : positions[0] ?? 0
		const disabledFlag = disabled ? true : undefined

		yield (
			<>
				<span class={trackClass} data-slot="slider-track">
					<span class={rangeClass} data-slot="slider-range" style={rangeStyle(orientation, start, end)} />
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
							aria-orientation={orientation}
							class={inputClass}
							data-slot="slider-input"
							disabled={disabledFlag}
							id={inputId(inputAttrs.id, index, values.length)}
							max={max}
							min={min}
							ref={element => runtime.inputs[index] = element}
							set:onchange={handleChange}
							set:oninput={handleInput}
							set:value={String(item)}
							step={step}
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
						data-slot="slider-thumb"
						key={`slider-thumb-${index}`}
						style={thumbStyle(orientation, item)}
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
	...inputAttrs
}) => {
	const disabledFlag = disabled ? true : undefined
	const thumbs = (value ?? defaultValue)?.length || 1
	const field = FieldContext()
	const groupAttrs = field && thumbs > 1 ? field.groupAttrs : undefined
	const controlAttrs = field && thumbs === 1 ? field.controlAttrs : undefined
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
