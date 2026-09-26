import type { Children, Host, IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import type { OmitArg } from './utils'
import { dom, id, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'

type FieldBehaviorArgs = {
	/** Marks composed field parts as invalid for ARIA wiring. */
	invalid?: boolean
	/** Stable id prefix for the field wiring. */
	name?: string
}

type FieldRootArgs = WithChildren<FieldBehaviorArgs>

/** Arguments for a field host that coordinates labels, descriptions, and errors. */
export type FieldArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'children'> & FieldBehaviorArgs>

/** Arguments for the label of the field's control. */
export type FieldLabelArgs = WithChildren<IntrinsicElements['label']>

/** Arguments for helper text that describes the field's control. */
export type FieldDescriptionArgs = WithChildren<IntrinsicElements['p']>

/** One validation error, as form libraries and server validation report it. */
export type FieldErrorItem = { message?: string } | undefined

/** Arguments for the field's validation message. */
export type FieldErrorArgs = WithChildren<IntrinsicElements['div'] & {
	/** Messages shown when there are no children; duplicates collapse. */
	errors?: FieldErrorItem[]
}>

// Stable ids and attribute bags for one field. Descriptions register on every
// render; one that stops rendering leaves aria-describedby after a microtask.
const label = (host: Host, { prefix = 'field' }: { prefix?: string } = {}) => {
	const base = id(prefix)
	const ids = {
		control: base,
		description: `${base}-description`,
		error: `${base}-error`,
		label: `${base}-label`,
	} as const
	let described = false
	let invalid = false
	let pending = false
	let present = false
	let pass = 0

	const schedule = () => {
		if (!dom(host) || pending) return

		pending = true
		queueMicrotask(() => {
			pending = false
			host.next()
		})
	}

	const describedby = () => {
		const values: string[] = []
		if (described) values.push(ids.description)
		if (invalid) values.push(ids.error)
		return values.join(' ') || undefined
	}

	const controlAttrs = () => ({
		id: ids.control,
		'aria-describedby': describedby(),
		'aria-invalid': invalid ? 'true' as const : undefined,
		'aria-errormessage': invalid ? ids.error : undefined,
	})

	return {
		/** Stable ids for the field parts. */
		ids,
		sync(next: boolean) {
			invalid = next
		},
		/** Records that a description rendered in this pass. */
		describe(next: boolean) {
			present = next
			if (described === present) return
			described = present
			schedule()
		},
		/** Attributes for the label element. */
		get labelAttrs() {
			return { id: ids.label, for: ids.control }
		},
		/** Attributes for a native labelable control. */
		get controlAttrs() {
			return controlAttrs()
		},
		/** Attributes for a button control, named by the label's id. */
		get buttonAttrs() {
			return { ...controlAttrs(), 'aria-labelledby': ids.label }
		},
		/** Attributes for a group of controls. */
		get groupAttrs() {
			return { 'aria-labelledby': ids.label, 'aria-describedby': describedby() }
		},
		/** Attributes for the description element. */
		get descriptionAttrs() {
			return { id: ids.description }
		},
		/** Attributes for the error element. */
		get errorAttrs() {
			return { id: ids.error }
		},
		reset() {
			present = false

			if (!described || !dom(host)) return
			const current = ++pass

			queueMicrotask(() => {
				if (current !== pass || present || !described) return
				host.next(() => {
					described = false
				})
			})
		},
	}
}

/** Field wiring that controls composed inside a Field read and spread. */
export type FieldContextValue = Omit<ReturnType<typeof label>, 'reset' | 'sync'>

/** Field context carrying the wiring to composed field parts. */
export const FieldContext = context<FieldContextValue | null>(null)

/** Unstyled behavior root for one field's label, description, and error wiring. */
const FieldRoot: Stateful<FieldRootArgs> = function* (args) {
	const view = label(this, { prefix: args.name })

	for (const next of this) {
		view.reset()
		view.sync(Boolean(next.invalid))
		FieldContext(view)

		yield <>{next.children}</>
	}
}

/** Unstyled field host with label, description, and error wiring. */
export const Field: Stateless<FieldArgs> = ({
	children,
	invalid,
	name,
	...attrs
}) => (
	<FieldRoot
		{...rootAttrs(attrs)}
		invalid={invalid}
		name={name}
		attr:data-slot="field"
	>
		{children}
	</FieldRoot>
)

/** Unstyled label for the field's control. */
export const FieldLabel: Stateless<FieldLabelArgs> = ({ children, ...attrs }) => (
	<label {...FieldContext()?.labelAttrs} {...attrs} data-slot="field-label">
		{children}
	</label>
)

/** Unstyled helper text that the field's control references through aria-describedby. */
export const FieldDescription: Stateless<FieldDescriptionArgs> = ({ children, ...attrs }) => {
	const field = FieldContext()
	field?.describe(true)

	return (
		<p {...field?.descriptionAttrs} {...attrs} data-slot="field-description">
			{children}
		</p>
	)
}

const messages = (errors: FieldErrorItem[] = []): Children => {
	const unique = [...new Set(errors.map(error => error?.message).filter(Boolean))]
	if (unique.length < 2) return unique[0]

	return (
		<ul data-slot="field-error-list">
			{unique.map(message => <li key={message}>{message}</li>)}
		</ul>
	)
}

/** Unstyled validation message; renders nothing without children or error messages. */
export const FieldError: Stateless<FieldErrorArgs> = ({
	children,
	errors,
	role = 'alert',
	...attrs
}) => {
	const content = children ?? messages(errors)
	if (!content) return null

	return (
		<div {...FieldContext()?.errorAttrs} {...attrs} data-slot="field-error" role={role}>
			{content}
		</div>
	)
}
