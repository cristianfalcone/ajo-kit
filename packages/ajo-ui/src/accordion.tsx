import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { controlled, listen, roving, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'
import type { FixedArgs, OmitArg } from './utils'
import { strings } from './utils'
import { Collapsible, CollapsibleContent, CollapsibleContext, CollapsibleTrigger } from './collapsible'

export type AccordionType = 'multiple' | 'single'

type AccordionSharedArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'onchange'> & {
	/** Disable every accordion item. */
	disabled?: boolean
}> & FixedArgs<'onchange'>

export type AccordionSingleArgs = AccordionSharedArgs & {
	/** Allow the open item to close. */
	collapsible?: boolean
	/** Initial open item for uncontrolled usage. */
	defaultValue?: string
	/** Single-open accordion mode. */
	type?: 'single'
	/** Controlled open item. */
	value?: string
	/** Called whenever the open item changes. */
	onValueChange?: (value: string, event?: Event) => void
}

export type AccordionMultipleArgs = AccordionSharedArgs & {
	/** Initial open items for uncontrolled usage. */
	defaultValue?: string[]
	/** Multiple-open accordion mode. */
	type: 'multiple'
	/** Controlled open items. */
	value?: string[]
	/** Called whenever the open items change. */
	onValueChange?: (value: string[], event?: Event) => void
}

export type AccordionArgs = AccordionMultipleArgs | AccordionSingleArgs

export type AccordionItemArgs = WithChildren<OmitArg<IntrinsicElements['details'], 'open'> & {
	/** Stable item value used by the parent accordion. */
	value: string
	/** Disable this item. */
	disabled?: boolean
}> & FixedArgs<'open'>

export type AccordionTriggerArgs = WithChildren<IntrinsicElements['summary']>

export type AccordionContentArgs = WithChildren<IntrinsicElements['div'] & {
	/** Classes for an inner content wrapper. */
	innerClass?: string
}>

type AccordionRootArgs = WithChildren<{
	collapsible?: boolean
	defaultValue?: string | string[]
	disabled?: boolean
	onValueChange?: ((value: string, event?: Event) => void) | ((value: string[], event?: Event) => void)
	type: AccordionType
	value?: string | string[]
}>

type AccordionContextValue = {
	collapsible: boolean
	disabled: boolean
	isOpen: (value: string) => boolean
	toggle: (value: string, event?: Event) => void
	type: AccordionType
}

const AccordionContext = context<AccordionContextValue | null>(null)

const sameArray = (first: string[], second: string[]) =>
	first.length === second.length && first.every((value, index) => value === second[index])

const AccordionRoot: Stateful<AccordionRootArgs> = function* ({ defaultValue, type, value }) {
	let collapsible = false
	let disabled = false
	let onValueChange: AccordionArgs['onValueChange']
	let mode: AccordionType = type
	const multipleState = controlled<string[]>(this, {
		fallback: type === 'multiple' ? strings(value ?? defaultValue) : [],
		onChange: (next, event) => {
			const notify = onValueChange as ((value: string[], event?: Event) => void) | undefined
			notify?.(next, event)
		},
	})
	const singleState = controlled<string>(this, {
		fallback: type === 'single' ? String(value ?? defaultValue ?? '') : '',
		onChange: (next, event) => {
			const notify = onValueChange as ((value: string, event?: Event) => void) | undefined
			notify?.(next, event)
		},
	})
	let multiple = multipleState.value
	let single = singleState.value

	const isOpen = (itemValue: string) =>
		mode === 'multiple' ? multiple.includes(itemValue) : single === itemValue

	const setSingle = (next: string, event?: Event) => {
		if (next === single) return
		singleState.set(next, event)
	}

	const setMultiple = (next: string[], event?: Event) => {
		if (sameArray(next, multiple)) return
		multipleState.set(next, event)
	}

	const toggle = (itemValue: string, event?: Event) => {
		if (disabled) return

		if (mode === 'multiple') {
			setMultiple(
				multiple.includes(itemValue)
					? multiple.filter(value => value !== itemValue)
					: [...multiple, itemValue],
				event,
			)
			return
		}

		if (single === itemValue) {
			if (collapsible) setSingle('', event)
			return
		}

		setSingle(itemValue, event)
	}

	const nav = roving(this, {
		items: () => Array.from(this.querySelectorAll<HTMLElement>('[data-slot="accordion-trigger"]'))
			.filter(trigger => trigger.getAttribute('aria-disabled') !== 'true' && trigger.offsetParent !== null),
		onMove: target => target.focus(),
	})

	listen(this, 'keydown', (event: KeyboardEvent) => {
		const target = event.target as HTMLElement | null
		if (!target?.matches('[data-slot="accordion-trigger"]')) return

		nav.handle(event)
	})

	for (const args of this) {
		mode = args.type ?? 'single'
		collapsible = mode === 'single' && Boolean((args as AccordionSingleArgs).collapsible)
		disabled = Boolean(args.disabled)
		onValueChange = args.onValueChange
		multipleState.sync(mode === 'multiple' && args.value != null ? strings(args.value) : undefined)
		singleState.sync(mode === 'single' && args.value != null ? String(args.value ?? '') : undefined)
		multiple = mode === 'multiple' ? multipleState.value : []
		single = mode === 'single' ? singleState.value : ''

		AccordionContext({ collapsible, disabled, isOpen, toggle, type: mode })
		yield <>{args.children}</>
	}
}


/** Unstyled root provider for accordion state. */
const Accordion: Stateless<AccordionArgs> = ({
	children,
	collapsible,
	defaultValue,
	disabled,
	onValueChange,
	type = 'single',
	value,
	...attrs
}) => (
	<AccordionRoot
		{...rootAttrs(attrs)}
		collapsible={collapsible === true}
		defaultValue={defaultValue}
		disabled={Boolean(disabled)}
		onValueChange={onValueChange}
		type={type}
		value={value}
		attr:data-slot="accordion"
	>
		{children}
	</AccordionRoot>
)

/** Unstyled accordion section: a group-controlled collapsible details element. */
const AccordionItem: Stateless<AccordionItemArgs> = ({
	children,
	disabled,
	open: _open,
	value,
	...attrs
}) => {
	const accordion = AccordionContext()
	const itemValue = String(value)
	const opened = Boolean(accordion?.isOpen(itemValue))
	const disabledFlag = Boolean(disabled ?? accordion?.disabled)

	return (
		<Collapsible
			data-orientation="vertical"
			data-slot="accordion-item"
			data-value={value}
			{...attrs}
			disabled={disabledFlag}
			onOpenChange={(_next: boolean, event?: Event) => accordion?.toggle(itemValue, event)}
			open={opened}
		>
			{children}
		</Collapsible>
	)
}

/** Unstyled accordion heading trigger: a collapsible summary locked by group rules. */
const AccordionTrigger: Stateless<AccordionTriggerArgs> = ({
	children,
	...attrs
}) => {
	const accordion = AccordionContext()
	const item = CollapsibleContext()
	const locked = Boolean(item?.open && accordion?.type === 'single' && !accordion.collapsible)

	return (
		<CollapsibleTrigger
			data-orientation="vertical"
			data-slot="accordion-trigger"
			{...attrs}
			locked={locked}
		>
			{children}
		</CollapsibleTrigger>
	)
}

/** Unstyled accordion panel content. */
const AccordionContent: Stateless<AccordionContentArgs> = ({
	children,
	innerClass,
	...attrs
}) => (
	<CollapsibleContent
		data-orientation="vertical"
		data-slot="accordion-content"
		role="region"
		{...attrs}
	>
		<div class={innerClass}>
			{children}
		</div>
	</CollapsibleContent>
)

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger }
