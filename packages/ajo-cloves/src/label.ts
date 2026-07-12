import type { Host } from './core'
import { dom, id } from './core'

/** Stable ids generated for one labelled field. */
export type LabelIds = {
	/** Id for the primary control. */
	readonly control: string
	/** Id for the optional description element. */
	readonly description: string
	/** Id for the optional error element. */
	readonly error: string
	/** Id for the label element. */
	readonly label: string
}

/** Plain attributes for native labelable controls. */
export type LabelControlAttrs = {
	/** Space-separated ids of description/error elements when present. */
	'aria-describedby'?: string
	/** Error id when the field is invalid. */
	'aria-errormessage'?: string
	/** Invalid state marker when the field is invalid. */
	'aria-invalid'?: 'true'
	/** Control id referenced by the label. */
	id: string
}

/** Plain attributes for button-like field controls. */
export type LabelButtonAttrs = LabelControlAttrs & {
	/** Label id used instead of native label-for activation. */
	'aria-labelledby': string
}

/** Plain attributes for grouped field surfaces without a control id. */
export type LabelGroupAttrs = {
	/** Space-separated ids of description/error elements when present. */
	'aria-describedby'?: string
	/** Label id for the group. */
	'aria-labelledby': string
}

/** Reactive inputs used to configure one field-labelling view. */
export type LabelOptions = {
	/** Prefix used for the stable ids. Default: `field`. */
	prefix?: () => string | undefined
}

/** Live field-labelling view returned by the label clove. */
export type LabelView = {
	/** Stable ids for the field parts. */
	readonly ids: LabelIds
	/** Attributes for button-like controls. */
	readonly buttonAttrs: LabelButtonAttrs
	/** Attributes for native labelable controls. */
	readonly controlAttrs: LabelControlAttrs
	/** Attributes for the description element. */
	readonly descriptionAttrs: { id: string }
	/** Records whether a description element rendered in this pass. */
	describe(present: boolean): void
	/** Attributes for the error element. */
	readonly errorAttrs: { id: string }
	/** Attributes for grouped field surfaces. */
	readonly groupAttrs: LabelGroupAttrs
	/** Attributes for the label element. */
	readonly labelAttrs: { for: string; id: string }
	/** Begins a render pass that may re-register description presence. */
	reset(): void
	/** Updates invalid/error wiring from current args. */
	sync(invalid: boolean): void
}

/** Field labelling: stable ids and label/control/description/error wiring for one form field. */
export const label = (host: Host, options: LabelOptions = {}): LabelView => {
	const base = id(options.prefix?.() ?? 'field')
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

	const controlAttrs = (): LabelControlAttrs => ({
		id: ids.control,
		'aria-describedby': describedby(),
		'aria-invalid': invalid ? 'true' : undefined,
		'aria-errormessage': invalid ? ids.error : undefined,
	})

	return {
		ids,
		sync(next) {
			invalid = next
		},
		describe(next) {
			if (next) {
				present = true
				if (described) return
				described = true
				schedule()
				return
			}

			present = false
			if (!described) return
			described = false
			schedule()
		},
		get labelAttrs() {
			return {
				id: ids.label,
				for: ids.control,
			}
		},
		get controlAttrs() {
			return controlAttrs()
		},
		get buttonAttrs() {
			return {
				...controlAttrs(),
				'aria-labelledby': ids.label,
			}
		},
		get groupAttrs() {
			return {
				'aria-labelledby': ids.label,
				'aria-describedby': describedby(),
			}
		},
		get descriptionAttrs() {
			return { id: ids.description }
		},
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
