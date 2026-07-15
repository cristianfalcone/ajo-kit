/** @jsxImportSource ajo */
import { InputOTP, type InputOTPArgs } from 'ajo-ui-playa/input-otp'
import { Marker } from 'ajo-ui-playa/marker'
import { VirtualList, type VirtualListApi } from 'ajo-ui-playa/virtual-list'
import type { AccordionContentArgs } from 'ajo-ui-playa/accordion'
import type { AvatarArgs, AvatarImageArgs } from 'ajo-ui-playa/avatar'
import type { CalendarSingleArgs } from 'ajo-ui-playa/calendar'
import type { CarouselButtonArgs } from 'ajo-ui-playa/carousel'
import type { CheckboxArgs } from 'ajo-ui-playa/checkbox'
import type {
	AvatarArgs as BaseAvatarArgs,
	AvatarImageArgs as BaseAvatarImageArgs,
} from 'ajo-ui/avatar'

type Equal<Left, Right> =
	(<Value>() => Value extends Left ? 1 : 2) extends
	(<Value>() => Value extends Right ? 1 : 2) ? true : false
type IsUnknown<Value> = unknown extends Value
	? keyof Value extends never ? true : false
	: false
type Expect<Value extends true> = Value

export type InputOtpRootClassContract = Expect<Equal<InputOTPArgs['class'], string | undefined>>
export type InputOtpInputClassContract = Expect<Equal<InputOTPArgs['inputClass'], string | undefined>>
export type InputOtpOmitsLegacyContainerClassName = Expect<IsUnknown<InputOTPArgs['containerClassName']>>

export const polymorphicMarkerAndInputOtpSurface = (
	<>
		<Marker
			as="a"
			href="/docs"
			ref={element => {
				if (element) element.href = '/docs/marker'
			}}
			variant="border"
		>
			Marker docs
		</Marker>
		<Marker
			as="button"
			ref={element => {
				if (element) element.disabled = false
			}}
			type="button"
		>
			Run marker action
		</Marker>
		<Marker
			as="span"
			ref={element => {
				if (element) element.title = 'Inline marker'
			}}
			variant="separator"
		>
			Inline marker
		</Marker>
		<Marker
			ref={element => {
				if (element) element.hidden = false
			}}
		>
			Default marker
		</Marker>
		{/* @ts-expect-error Anchor markers require an href. */}
		<Marker as="a">Missing href</Marker>
		<InputOTP
			class="max-w-sm"
			inputClass="tracking-widest"
			maxLength={6}
			onValueChange={(value, event) => {
				value.toUpperCase()
				event?.preventDefault()
			}}
		/>
	</>
)

export type CheckboxChangeContract = Expect<Equal<
	CheckboxArgs['onCheckedChange'],
	((checked: boolean, event: Event) => void) | undefined
>>

export type CalendarNextLabelContract = Expect<Equal<CalendarSingleArgs['nextMonthLabel'], string | undefined>>
export type CalendarPreviousLabelContract = Expect<Equal<CalendarSingleArgs['previousMonthLabel'], string | undefined>>
export type CalendarMonthSelectLabelContract = Expect<Equal<CalendarSingleArgs['monthSelectLabel'], string | undefined>>
export type CalendarYearSelectLabelContract = Expect<Equal<CalendarSingleArgs['yearSelectLabel'], string | undefined>>

export type AvatarRootDerivesBase = Expect<AvatarArgs extends BaseAvatarArgs ? true : false>
export type AvatarImageDerivesBase = Expect<AvatarImageArgs extends BaseAvatarImageArgs ? true : false>

export const accordionThemeOwnsInnerClass: AccordionContentArgs = {
	// @ts-expect-error AccordionContent owns its base inner wrapper recipe.
	innerClass: 'consumer-inner',
}

export const carouselThemeOwnsButtonChildren: CarouselButtonArgs = {
	// @ts-expect-error Carousel buttons own their icon and accessible label children.
	children: 'Consumer children',
}

export const checkboxThemeOwnsInputRecipe: CheckboxArgs = {
	// @ts-expect-error Checkbox owns its invisible native-input recipe.
	inputClass: 'consumer-input',
}

export const calendarThemeOwnsNavigationRecipe: CalendarSingleArgs = {
	// @ts-expect-error Calendar owns its navigation-button recipe.
	navButtonClass: 'consumer-nav',
}

type VirtualPerson = { id: string; name: string }

const virtualPeople: readonly VirtualPerson[] = [{ id: 'ada', name: 'Ada' }]

export const virtualListThemePreservesGenericInference = (
	<VirtualList
		items={virtualPeople}
		getItemKey={person => person.id}
		estimateSize={person => person.name.length * 8}
		renderItem={person => {
			// @ts-expect-error The Playa adapter must not erase the inferred item shape.
			return person.missing
		}}
		setApi={(api: VirtualListApi<string>) => api.scrollTo({ key: 'ada' })}
	/>
)
