import type { Stateless } from 'ajo'
import { clx } from 'ajo-ui/utils'
import {
	AccordionContent as BaseAccordionContent,
	AccordionItem as BaseAccordionItem,
	AccordionTrigger as BaseAccordionTrigger,
	type AccordionContentArgs as BaseAccordionContentArgs,
	type AccordionItemArgs as BaseAccordionItemArgs,
	type AccordionMultipleArgs as BaseAccordionMultipleArgs,
	type AccordionSingleArgs as BaseAccordionSingleArgs,
	type AccordionTriggerArgs as BaseAccordionTriggerArgs,
} from 'ajo-ui/accordion'
import { disclosureContent } from './internal/disclosure'
export { Accordion } from 'ajo-ui/accordion'
export type { AccordionType } from 'ajo-ui/accordion'

export type AccordionSingleArgs = BaseAccordionSingleArgs & { class?: string }
export type AccordionMultipleArgs = BaseAccordionMultipleArgs & { class?: string }
export type AccordionArgs = AccordionSingleArgs | AccordionMultipleArgs
export type AccordionItemArgs = BaseAccordionItemArgs & { class?: string }
export type AccordionTriggerArgs = BaseAccordionTriggerArgs & { class?: string }
export type AccordionContentArgs = BaseAccordionContentArgs & { class?: string }

const itemBase = clx('border-b last:border-b-0', disclosureContent)
// The trigger is the heavier line and the content steps back. Its ring stands
// 2 px off the row, as an inline link's does, since the label starts where
// the row starts; py-4 already clears the label vertically. Only a
// disabled item dims: the open item of a non-collapsible accordion is locked
// (aria-disabled), not disabled.
const triggerBase = 'flex flex-1 cursor-pointer list-none items-start justify-between gap-4 rounded-md py-4 text-start text-sm font-medium transition-all playa-focus [--focus-offset:2px] aria-disabled:pointer-events-none data-[disabled]:opacity-[var(--disabled-opacity)] [&::-webkit-details-marker]:hidden [&[data-state=open]>[data-accordion-chevron]]:rotate-180'

/** Accordion section rendered as a native details element. */
const AccordionItem: Stateless<AccordionItemArgs> = ({ class: classes, ...attrs }) => (
	<BaseAccordionItem {...attrs} class={clx(itemBase, classes)} />
)

/** Accordion heading trigger rendered as a native summary element. */
const AccordionTrigger: Stateless<AccordionTriggerArgs> = ({ children, class: classes, ...attrs }) => (
	<BaseAccordionTrigger {...attrs} class={clx(triggerBase, classes)}>
		{children}
		<span aria-hidden="true" data-accordion-chevron class="i-lucide-chevron-down pointer-events-none size-4 shrink-0 translate-y-0.5 text-muted-foreground transition-transform duration-200" />
	</BaseAccordionTrigger>
)

/** Content region of an accordion item. */
const AccordionContent: Stateless<AccordionContentArgs> = ({ children, class: classes, ...attrs }) => (
	<BaseAccordionContent {...attrs} class="overflow-hidden text-sm text-muted-foreground">
		<div class={clx('pb-4 pt-0', classes)}>
			{children}
		</div>
	</BaseAccordionContent>
)

export { AccordionContent, AccordionItem, AccordionTrigger }
