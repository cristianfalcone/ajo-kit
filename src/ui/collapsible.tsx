import type { Stateless } from 'ajo'
import clsx from 'clsx'
import {
	Collapsible as BaseCollapsible,
	CollapsibleContent as BaseCollapsibleContent,
	CollapsibleTrigger as BaseCollapsibleTrigger,
	type CollapsibleArgs as BaseCollapsibleArgs,
	type CollapsibleContentArgs as BaseCollapsibleContentArgs,
	type CollapsibleTriggerArgs as BaseCollapsibleTriggerArgs,
} from 'ajo-ui/collapsible'

export type CollapsibleArgs = BaseCollapsibleArgs & { class?: string }
export type CollapsibleTriggerArgs = BaseCollapsibleTriggerArgs & { class?: string }
export type CollapsibleContentArgs = BaseCollapsibleContentArgs & { class?: string }

const triggerBase = 'inline-flex cursor-pointer list-none items-center justify-center gap-2 rounded-md text-sm font-medium transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&::-webkit-details-marker]:hidden [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4'
const contentBase = 'overflow-hidden'

// Native details enter/exit: ::details-content transitions block-size to auto
// (via the preflight's interpolate-size opt-in), with allow-discrete
// content-visibility so closing content stays visible while it shrinks.
// Engines without ::details-content keep the instant toggle. Shared with
// AccordionItem, the other details-backed disclosure.
export const disclosureContent = '[&::details-content]:overflow-hidden [&::details-content]:[block-size:0] [&[open]::details-content]:[block-size:auto] [&::details-content]:transition-[block-size,content-visibility] [&::details-content]:duration-200 [&::details-content]:ease-out [&::details-content]:[transition-behavior:allow-discrete] motion-reduce:[&::details-content]:transition-none'

/** Collapsible disclosure rendered as a native details element. */
const Collapsible: Stateless<CollapsibleArgs> = ({
	children,
	class: classes,
	defaultOpen,
	disabled,
	onOpenChange,
	open,
	...attrs
}) => (
	<BaseCollapsible
		{...attrs}
		class={clsx(disclosureContent, classes)}
		defaultOpen={defaultOpen}
		disabled={Boolean(disabled)}
		onOpenChange={onOpenChange}
		open={open}
	>
		{children}
	</BaseCollapsible>
)

/** Summary trigger that toggles a parent Collapsible. */
const CollapsibleTrigger: Stateless<CollapsibleTriggerArgs> = ({
	children,
	class: classes,
	disabled,
	id,
	'set:onclick': onClick,
	...attrs
}) => (
	<BaseCollapsibleTrigger
		{...attrs}
		class={clsx(triggerBase, classes)}
		disabled={disabled}
		id={id}
		set:onclick={onClick}
	>
		{children}
	</BaseCollapsibleTrigger>
)

/** Content panel natively shown or hidden by a parent Collapsible. */
const CollapsibleContent: Stateless<CollapsibleContentArgs> = ({
	children,
	class: classes,
	...attrs
}) => (
	<BaseCollapsibleContent
		{...attrs}
		class={clsx(contentBase, classes)}
	>
		{children}
	</BaseCollapsibleContent>
)

export { Collapsible, CollapsibleContent, CollapsibleTrigger }
