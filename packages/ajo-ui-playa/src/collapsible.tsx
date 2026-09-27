import type { Stateless } from 'ajo'
import { clx } from 'ajo-ui/utils'
import {
	Collapsible as BaseCollapsible,
	CollapsibleContent as BaseCollapsibleContent,
	CollapsibleTrigger as BaseCollapsibleTrigger,
	type CollapsibleArgs as BaseCollapsibleArgs,
	type CollapsibleContentArgs as BaseCollapsibleContentArgs,
	type CollapsibleTriggerArgs as BaseCollapsibleTriggerArgs,
} from 'ajo-ui/collapsible'
import { disclosureContent } from './internal/recipes'

export type CollapsibleArgs = BaseCollapsibleArgs & { class?: string }
export type CollapsibleTriggerArgs = BaseCollapsibleTriggerArgs & { class?: string }
export type CollapsibleContentArgs = BaseCollapsibleContentArgs & { class?: string }

const triggerBase = 'inline-flex cursor-pointer list-none items-center justify-center gap-2 rounded-md text-sm font-medium transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&::-webkit-details-marker]:hidden [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4'
const contentBase = 'overflow-hidden'

/** Collapsible disclosure rendered as a native details element. */
const Collapsible: Stateless<CollapsibleArgs> = ({ class: classes, ...attrs }) => (
	<BaseCollapsible {...attrs} class={clx(disclosureContent, classes)} />
)

/** Summary trigger that toggles a parent Collapsible. */
const CollapsibleTrigger: Stateless<CollapsibleTriggerArgs> = ({ class: classes, ...attrs }) => (
	<BaseCollapsibleTrigger {...attrs} class={clx(triggerBase, classes)} />
)

/** Content region natively shown or hidden by a parent Collapsible. */
const CollapsibleContent: Stateless<CollapsibleContentArgs> = ({ class: classes, ...attrs }) => (
	<BaseCollapsibleContent {...attrs} class={clx(contentBase, classes)} />
)

export { Collapsible, CollapsibleContent, CollapsibleTrigger }
