import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { listen, roving, selection } from 'ajo-cloves'
import { context } from 'ajo/context'
import { rootAttrs, strings } from './shared'
import type { FixedArgs, OmitArg } from './utils'
import { Collapsible, CollapsibleContent, CollapsibleContext, CollapsibleTrigger } from './collapsible'

/** Selection model supported by an Accordion root. */
export type AccordionType = 'multiple' | 'single'

type AccordionSharedArgs = WithChildren<OmitArg<IntrinsicElements['div'], 'onchange'> & {
	/** Disable every accordion item. */
	disabled?: boolean
}> & FixedArgs<'onchange'>

/** Arguments for a single-open Accordion. */
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

/** Arguments for an Accordion that may keep several items open. */
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

/** Public arguments accepted by the Accordion root. */
export type AccordionArgs = AccordionMultipleArgs | AccordionSingleArgs

/** Arguments for one value-bearing Accordion item. */
export type AccordionItemArgs = WithChildren<OmitArg<IntrinsicElements['details'], 'open'> & {
	/** Stable item value used by the parent accordion. */
	value: string
	/** Disable this item. */
	disabled?: boolean
}> & FixedArgs<'open'>

/** Arguments for an Accordion item's summary trigger. */
export type AccordionTriggerArgs = WithChildren<IntrinsicElements['summary']>

/** Arguments for an Accordion item's collapsible panel. */
export type AccordionContentArgs = WithChildren<IntrinsicElements['div']>

type AccordionContextValue = {
	collapsible: boolean
	disabled: boolean
	isOpen: (value: string) => boolean
	toggle: (value: string, event?: Event) => void
	type: AccordionType
}

const AccordionContext = context<AccordionContextValue | null>(null)

const selected = (type: AccordionType, value: unknown) =>
	type === 'multiple'
		? strings(value)
		: value == null || value === '' ? [] : [String(value)]

const AccordionRoot: Stateful<AccordionArgs> = function* ({ defaultValue, type = 'single' }) {
	let collapsible = false
	let disabled = false
	let onValueChange: AccordionArgs['onValueChange']
	let mode: AccordionType = type
	const open = selection(this, {
		multiple: () => mode === 'multiple',
		required: () => mode === 'single' && !collapsible,
		fallback: selected(type, defaultValue),
		onChange: (next, event) => {
			if (mode === 'multiple') {
				(onValueChange as ((value: string[], event?: Event) => void) | undefined)?.(next, event)
			} else {
				(onValueChange as ((value: string, event?: Event) => void) | undefined)?.(next[0] ?? '', event)
			}
		},
	})

	const toggle = (itemValue: string, event?: Event) => {
		if (!disabled) open.toggle(itemValue, event)
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
		open.sync(args.value != null ? selected(mode, args.value) : undefined)

		AccordionContext({ collapsible, disabled, isOpen: open.has, toggle, type: mode })
		yield <>{args.children}</>
	}
}

/** Unstyled root provider for accordion state. */
const Accordion: Stateless<AccordionArgs> = args => (
	<AccordionRoot {...rootAttrs(args, ['collapsible', 'defaultValue', 'disabled', 'onValueChange', 'type', 'value'])} attr:data-slot="accordion" />
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
	...attrs
}) => (
	<CollapsibleContent
		data-orientation="vertical"
		data-slot="accordion-content"
		role="region"
		{...attrs}
	>
		{children}
	</CollapsibleContent>
)

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger }
