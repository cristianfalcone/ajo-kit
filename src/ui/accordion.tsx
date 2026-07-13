import type { Stateless } from 'ajo'
import clsx from 'clsx'
import type { FixedArgs, OmitArg } from 'ajo-ui/utils'
import {
	Accordion as BaseAccordion,
	AccordionContent as BaseAccordionContent,
	AccordionItem as BaseAccordionItem,
	AccordionTrigger as BaseAccordionTrigger,
	type AccordionArgs as BaseAccordionArgs,
	type AccordionContentArgs as BaseAccordionContentArgs,
	type AccordionItemArgs as BaseAccordionItemArgs,
	type AccordionMultipleArgs as BaseAccordionMultipleArgs,
	type AccordionSingleArgs as BaseAccordionSingleArgs,
	type AccordionTriggerArgs as BaseAccordionTriggerArgs,
	type AccordionType as BaseAccordionType,
} from 'ajo-ui/accordion'
import { disclosureContent } from './collapsible'

export type AccordionType = BaseAccordionType
export type AccordionSingleArgs = BaseAccordionSingleArgs & { class?: string }
export type AccordionMultipleArgs = BaseAccordionMultipleArgs & { class?: string }
export type AccordionArgs = AccordionSingleArgs | AccordionMultipleArgs
export type AccordionItemArgs = BaseAccordionItemArgs & { class?: string }
export type AccordionTriggerArgs = BaseAccordionTriggerArgs & { class?: string }
export type AccordionContentArgs = OmitArg<BaseAccordionContentArgs, 'innerClass'> & FixedArgs<'innerClass'> & { class?: string }

const itemBase = clsx('border-b last:border-b-0', disclosureContent)
const triggerBase = 'flex flex-1 cursor-pointer list-none items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&::-webkit-details-marker]:hidden [&[data-state=open]>[data-accordion-chevron]]:rotate-180'

/** Root provider for accordion state. */
const Accordion: Stateless<AccordionArgs> = ({
	class: classes,
	...attrs
}) => <BaseAccordion {...attrs as BaseAccordionArgs} class={classes} />

/** Accordion section rendered as a native details element. */
const AccordionItem: Stateless<AccordionItemArgs> = ({
	children,
	class: classes,
	disabled,
	open: _open,
	value,
	...attrs
}) => (
	<BaseAccordionItem
		{...attrs}
		class={clsx(itemBase, classes)}
		disabled={disabled}
		value={value}
	>
		{children}
	</BaseAccordionItem>
)

/** Accordion heading trigger rendered as a native summary element. */
const AccordionTrigger: Stateless<AccordionTriggerArgs> = ({
	children,
	class: classes,
	'set:onclick': onClick,
	...attrs
}) => (
	<BaseAccordionTrigger
		{...attrs}
		class={clsx(triggerBase, classes)}
		set:onclick={onClick}
	>
		{children}
		<span aria-hidden="true" data-accordion-chevron class="i-lucide-chevron-down pointer-events-none size-4 shrink-0 translate-y-0.5 text-muted-foreground transition-transform duration-200" />
	</BaseAccordionTrigger>
)

/** Accordion panel content. */
const AccordionContent: Stateless<AccordionContentArgs> = ({
	children,
	class: classes,
	...attrs
}) => (
	<BaseAccordionContent
		{...attrs}
		class="overflow-hidden text-sm"
		innerClass={clsx('pb-4 pt-0', classes)}
	>
		{children}
	</BaseAccordionContent>
)

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger }
