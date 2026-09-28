import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import { clx } from 'ajo-ui/utils'
import {
	Field as BaseField,
	FieldDescription as BaseFieldDescription,
	FieldError as BaseFieldError,
	FieldLabel as BaseFieldLabel,
	type FieldArgs as BaseFieldArgs,
	type FieldDescriptionArgs as BaseFieldDescriptionArgs,
	type FieldErrorArgs as BaseFieldErrorArgs,
	type FieldLabelArgs as BaseFieldLabelArgs,
} from 'ajo-ui/field'
import { labelBase } from './internal/recipes'

export type { FieldErrorItem } from 'ajo-ui/field'

export type FieldOrientation = 'horizontal' | 'responsive' | 'vertical'
export type FieldLegendVariant = 'label' | 'legend'

export type FieldSetArgs = WithChildren<IntrinsicElements['fieldset'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type FieldLegendArgs = WithChildren<IntrinsicElements['legend'] & {
	/** Visual scale for legend text. */
	variant?: FieldLegendVariant
	/** Additional UnoCSS classes. */
	class?: string
}>

export type FieldGroupArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type FieldRowArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type FieldArgs = BaseFieldArgs & {
	/**
	 * Whether the field's value is invalid. Pass it, even as `false`, on every
	 * field that can show an error: a vertical field then keeps its message
	 * line while valid, so the error appears without moving anything.
	 */
	invalid?: boolean
	/** Layout direction for the field content. */
	orientation?: FieldOrientation
	/** Marks the whole field as disabled for composed slot styling. */
	disabled?: boolean
	/** Additional UnoCSS classes. */
	class?: string
}

export type FieldContentArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type FieldLabelArgs = BaseFieldLabelArgs & {
	/** Additional UnoCSS classes. */
	class?: string
}

export type FieldTitleArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type FieldDescriptionArgs = BaseFieldDescriptionArgs & {
	/** Additional UnoCSS classes. */
	class?: string
}

export type FieldSeparatorArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type FieldErrorArgs = BaseFieldErrorArgs & {
	/** Additional UnoCSS classes. */
	class?: string
}

// One invalid treatment: the control's boundary and the message take the
// danger hue; the label, the value and the help keep theirs.
const fieldBase = 'group/field w-full'
const fieldOrientation: Record<FieldOrientation, string> = {
	// Label, control and message rows (the preset's field zones).
	vertical: 'playa-field-zones',
	// As tall as its content, so a list of choices keeps its options close; in
	// a FieldRow the control row's height centres it beside the inputs.
	horizontal: 'flex flex-row items-center gap-3 [&>[data-slot=field-label]]:flex-auto has-[>[data-slot=field-content]]:items-start',
	// The vertical zones, and one row from the field group's `md` width.
	responsive: 'playa-field-zones [&>*]:w-full [&>.sr-only]:w-auto @md/field-group:flex @md/field-group:flex-row @md/field-group:items-center @md/field-group:gap-3 @md/field-group:after:hidden @md/field-group:[&>*]:m-0 @md/field-group:[&>*]:w-auto @md/field-group:[&>[data-slot=field-label]]:flex-auto @md/field-group:has-[>[data-slot=field-content]]:items-start',
}

/** Semantic group for related form fields. */
const FieldSet: Stateless<FieldSetArgs> = ({
	class: classes,
	children,
	...attrs
}) => (
	<fieldset
		{...attrs}
		class={clx(
			'flex flex-col gap-6 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3',
			classes,
		)}
		data-slot="field-set"
	>
		{children}
	</fieldset>
)

/** Caption for a `FieldSet`. */
const FieldLegend: Stateless<FieldLegendArgs> = ({
	class: classes,
	children,
	variant = 'legend',
	...attrs
}) => (
	<legend
		{...attrs}
		class={clx(
			'mb-2 font-medium data-[variant=legend]:text-base data-[variant=label]:text-sm',
			classes,
		)}
		data-slot="field-legend"
		data-variant={variant}
	>
		{children}
	</legend>
)

/** Vertical stack for related fields. */
const FieldGroup: Stateless<FieldGroupArgs> = ({
	class: classes,
	children,
	...attrs
}) => (
	<div
		{...attrs}
		class={clx(
			'group/field-group @container/field-group flex w-full flex-col gap-6 [&>[data-slot=field-group]]:gap-4',
			classes,
		)}
		data-slot="field-group"
	>
		{children}
	</div>
)

/**
 * Fields side by side inside a `FieldGroup`: their label, control and message
 * rows line up across the row, and the row stacks when the group is narrow.
 */
const FieldRow: Stateless<FieldRowArgs> = ({
	class: classes,
	children,
	...attrs
}) => (
	<div {...attrs} class={clx('playa-field-row', classes)} data-slot="field-row">
		{children}
	</div>
)

/** Wrapper for one label, control, description, and validation message. */
const Field: Stateless<FieldArgs> = ({
	class: classes,
	children,
	disabled,
	invalid,
	name,
	orientation = 'vertical',
	role = 'group',
	...attrs
}) => (
	<BaseField
		{...attrs}
		class={clx(fieldBase, fieldOrientation[orientation], classes)}
		data-disabled={disabled ? 'true' : undefined}
		data-invalid={invalid === undefined ? undefined : String(invalid)}
		data-orientation={orientation}
		invalid={invalid}
		name={name}
		role={role}
	>
		{children}
	</BaseField>
)

/** Groups label copy and helper text beside horizontal controls. */
const FieldContent: Stateless<FieldContentArgs> = ({
	class: classes,
	children,
	...attrs
}) => (
	<div
		{...attrs}
		class={clx('group/field-content flex flex-1 flex-col gap-1', classes)}
		data-slot="field-content"
	>
		{children}
	</div>
)

/** Label for a field control. */
const FieldLabel: Stateless<FieldLabelArgs> = ({
	class: classes,
	children,
	...attrs
}) => (
	<BaseFieldLabel
		{...attrs}
		class={clx(
			labelBase,
			'group/field-label peer/field-label flex w-fit gap-2 group-data-[disabled=true]/field:opacity-50 has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:edge [&>*]:data-[slot=field]:p-4 has-[:checked]:inset-ring-primary has-[:checked]:bg-primary/5',
			classes,
		)}
	>
		{children}
	</BaseFieldLabel>
)

/** Non-label title for grouped controls that need separate labelable elements. */
const FieldTitle: Stateless<FieldTitleArgs> = ({
	class: classes,
	children,
	...attrs
}) => (
	<div
		{...attrs}
		class={clx('flex w-fit items-center gap-2 text-sm font-medium group-data-[disabled=true]/field:opacity-50', classes)}
		data-slot="field-label"
	>
		{children}
	</div>
)

/** Helper text for a field or fieldset. */
const FieldDescription: Stateless<FieldDescriptionArgs> = ({
	class: classes,
	children,
	...attrs
}) => (
	<BaseFieldDescription
		{...attrs}
		class={clx(
			'text-sm font-normal text-muted-foreground group-has-[[data-orientation=horizontal]]/field:text-balance [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-link',
			classes,
		)}
	>
		{children}
	</BaseFieldDescription>
)

/** Horizontal separator for sections within a `FieldGroup`. */
const FieldSeparator: Stateless<FieldSeparatorArgs> = ({
	class: classes,
	children,
	role = 'separator',
	...attrs
}) => (
	<div
		{...attrs}
		aria-orientation="horizontal"
		class={clx('relative flex h-5 items-center text-sm', classes)}
		data-content={children ? 'true' : undefined}
		data-slot="field-separator"
		role={role}
	>
		<span aria-hidden="true" class="absolute inset-x-0 top-1/2 h-px bg-border" />
		{children && (
			<span class="relative mx-auto block w-fit bg-background px-2 text-muted-foreground" data-slot="field-separator-content">
				{children}
			</span>
		)}
	</div>
)

/**
 * Validation message for a field, after an alert icon centred on its first
 * line; the text keeps block flow, so a link inside it wraps with the
 * sentence. In a vertical field it takes the help text's line.
 */
const FieldError: Stateless<FieldErrorArgs> = ({
	class: classes,
	children,
	...attrs
}) => (
	<BaseFieldError
		{...attrs}
		class={clx('relative ps-6 text-sm font-normal text-danger before:absolute before:start-0 before:top-0 before:i-lucide-circle-alert before:h-5 before:w-4 before:mask-contain before:mask-center before:content-empty', classes)}
	>
		{children}
	</BaseFieldError>
)

export {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldRow,
	FieldSeparator,
	FieldSet,
	FieldTitle,
}
