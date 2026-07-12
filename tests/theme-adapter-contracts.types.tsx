/** @jsxImportSource ajo */
import { InputOTP, type InputOTPArgs } from '../src/ui/input-otp'
import { Marker } from '../src/ui/marker'
import type {
	AccordionContentArgs,
	AvatarArgs,
	AvatarImageArgs,
	CalendarSingleArgs,
	CarouselButtonArgs,
	CheckboxArgs,
} from '../src/ui'
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
