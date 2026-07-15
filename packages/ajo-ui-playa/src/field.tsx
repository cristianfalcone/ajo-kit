import type { Children, IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'
import { Field as BaseField, FieldContext, type FieldArgs as BaseFieldArgs } from 'ajo-ui/field'
import Label, { type LabelArgs } from './label'

export type FieldOrientation = 'horizontal' | 'responsive' | 'vertical'
export type FieldLegendVariant = 'label' | 'legend'
export type FieldErrorItem = { message?: string } | undefined

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

export type FieldArgs = BaseFieldArgs & {
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

export type FieldLabelArgs = LabelArgs

export type FieldTitleArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type FieldDescriptionArgs = WithChildren<IntrinsicElements['p'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type FieldSeparatorArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type FieldErrorArgs = WithChildren<IntrinsicElements['div'] & {
	/** Validation errors from form libraries or server validation. */
	errors?: FieldErrorItem[]
	/** Additional UnoCSS classes. */
	class?: string
}>

const fieldBase = 'group/field flex w-full gap-3 data-[invalid=true]:text-danger'
const fieldOrientation: Record<FieldOrientation, string> = {
	vertical: 'flex-col [&>*]:w-full [&>.sr-only]:w-auto',
	horizontal: 'flex-row items-center [&>[data-slot=field-label]]:flex-auto has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
	responsive: 'flex-col @md/field-group:flex-row @md/field-group:items-center [&>*]:w-full @md/field-group:[&>*]:w-auto [&>.sr-only]:w-auto @md/field-group:[&>[data-slot=field-label]]:flex-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
}

const contentFromErrors = (errors?: FieldErrorItem[]): Children => {
	const messages = Array.from(new Set((errors ?? [])
		.map(error => error?.message)
		.filter((message): message is string => Boolean(message))))

	if (!messages.length) return null
	if (messages.length === 1) return messages[0]

	return (
		<ul class="ml-4 flex list-disc flex-col gap-1">
			{messages.map(message => <li key={message}>{message}</li>)}
		</ul>
	)
}

/** Semantic group for related form fields. */
const FieldSet: Stateless<FieldSetArgs> = ({
	class: classes,
	children,
	...attrs
}) => (
	<fieldset
		{...attrs}
		class={clsx(
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
		class={clsx(
			'mb-3 font-medium data-[variant=legend]:text-base data-[variant=label]:text-sm',
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
		class={clsx(
			'group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4',
			classes,
		)}
		data-slot="field-group"
	>
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
		class={clsx(fieldBase, fieldOrientation[orientation], classes)}
		data-disabled={disabled ? 'true' : undefined}
		data-invalid={invalid ? 'true' : undefined}
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
		class={clsx('group/field-content flex flex-1 flex-col gap-1.5 leading-snug', classes)}
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
}) => {
	const field = FieldContext()

	return (
		<Label
			{...(field?.labelAttrs ?? {})}
			{...attrs}
			class={clsx(
				'group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:edge [&>*]:data-[slot=field]:p-4 has-data-[state=checked]:inset-ring-primary has-data-[state=checked]:bg-primary/5 has-[:checked]:inset-ring-primary has-[:checked]:bg-primary/5',
				classes,
			)}
			data-slot="field-label"
		>
			{children}
		</Label>
	)
}

/** Non-label title for grouped controls that need separate labelable elements. */
const FieldTitle: Stateless<FieldTitleArgs> = ({
	class: classes,
	children,
	...attrs
}) => (
	<div
		{...attrs}
		class={clsx('flex w-fit items-center gap-2 text-sm font-medium leading-snug group-data-[disabled=true]/field:opacity-50', classes)}
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
}) => {
	const field = FieldContext()
	field?.describe(true)

	return (
		<p
			{...(field?.descriptionAttrs ?? {})}
			{...attrs}
			class={clsx(
				'text-sm font-normal leading-normal text-muted-foreground group-has-[[data-orientation=horizontal]]/field:text-balance last:mt-0 nth-last-2:-mt-1 [[data-variant=legend]+&]:-mt-1.5 [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
				classes,
			)}
			data-slot="field-description"
		>
			{children}
		</p>
	)
}

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
		class={clsx('relative -my-2 flex h-5 items-center text-sm group-data-[variant=outline]/field-group:-mb-2', classes)}
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

/** Validation message for a field. */
const FieldError: Stateless<FieldErrorArgs> = ({
	class: classes,
	children,
	errors,
	role = 'alert',
	...attrs
}) => {
	const content = children ?? contentFromErrors(errors)
	if (!content) return null

	return (
		<div
			{...(FieldContext()?.errorAttrs ?? {})}
			{...attrs}
			class={clsx('text-sm font-normal text-danger', classes)}
			data-slot="field-error"
			role={role}
		>
			{content}
		</div>
	)
}

export {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSeparator,
	FieldSet,
	FieldTitle,
}
