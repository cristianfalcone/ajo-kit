import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import type { OmitArg } from './utils'
import { label, statefulRootAttrs as rootAttrs, type LabelView } from 'ajo-cloves'
import { context } from 'ajo/context'

type FieldBehaviorArgs = {
	/** Marks composed field parts as invalid for ARIA wiring. */
	invalid?: boolean
	/** Stable id prefix for the field wiring. */
	name?: string
}

type FieldRootArgs = WithChildren<FieldBehaviorArgs>

export type FieldArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'children'> & FieldBehaviorArgs>

export type FieldContextValue = Pick<LabelView,
	| 'buttonAttrs'
	| 'controlAttrs'
	| 'describe'
	| 'descriptionAttrs'
	| 'errorAttrs'
	| 'groupAttrs'
	| 'ids'
	| 'labelAttrs'
>

/** Field context carrying label clove wiring to composed field parts. */
export const FieldContext = context<FieldContextValue | null>(null)

/** Unstyled behavior root for one field's label, description, and error wiring. */
const FieldRoot: Stateful<FieldRootArgs> = function* (args) {
	const view = label(this, () => args.name)

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
