import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'

export type MessageAlign = 'end' | 'start'

export type MessageGroupArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type MessageArgs = WithChildren<IntrinsicElements['div'] & {
	/** Align message row to the start or end side of the conversation. */
	align?: MessageAlign
	/** Additional UnoCSS classes. */
	class?: string
}>

export type MessageAvatarArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type MessageContentArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type MessageHeaderArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type MessageFooterArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

// Tight run of one sender's messages; only the last row keeps its bubble
// tail so the run reads as one set (mirrors BubbleGroup one level up).
const groupBase = [
	'flex min-w-0 flex-col gap-1',
	'[&>[data-slot=message]:not(:last-child)_[data-slot=bubble-content]]:rounded-bl-2xl',
	'[&>[data-slot=message]:not(:last-child)_[data-slot=bubble-content]]:rounded-br-2xl',
].join(' ')
const messageBase = 'group/message relative flex w-full min-w-0 gap-2 text-sm data-[align=end]:flex-row-reverse'
// Top-aligned avatar: robust regardless of header/footer presence or height.
const avatarBase = 'flex w-fit min-w-8 shrink-0 items-center justify-center self-start overflow-hidden rounded-full bg-muted'
const contentBase = 'flex w-full min-w-0 flex-col gap-1 break-words [[data-slot=message][data-align=end]_&>*[data-slot]]:self-end'
const headerBase = 'flex max-w-full min-w-0 items-center gap-2 px-3.5 text-xs font-medium text-muted-foreground [[data-slot=message]:has([data-variant=ghost])_&]:px-0'
const footerBase = 'flex max-w-full min-w-0 items-center gap-2 px-3.5 text-xs text-muted-foreground [[data-slot=message]:has([data-variant=ghost])_&]:px-0 [[data-slot=message][data-align=end]_&]:justify-end'

/** Groups consecutive messages from the same sender. */
const MessageGroup: Stateless<MessageGroupArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={clsx(groupBase, classes)} data-slot="message-group">
		{children}
	</div>
)

/** Presentational row wrapper for one conversation message. */
const Message: Stateless<MessageArgs> = ({
	align = 'start',
	children,
	class: classes,
	...attrs
}) => (
	<div
		{...attrs}
		class={clsx(messageBase, classes)}
		data-align={align}
		data-slot="message"
	>
		{children}
	</div>
)

/** Avatar slot aligned to the message surface. */
const MessageAvatar: Stateless<MessageAvatarArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={clsx(avatarBase, classes)} data-slot="message-avatar">
		{children}
	</div>
)

/** Wraps message header, visible surface, and footer. */
const MessageContent: Stateless<MessageContentArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={clsx(contentBase, classes)} data-slot="message-content">
		{children}
	</div>
)

/** Sender/name metadata above the message surface. */
const MessageHeader: Stateless<MessageHeaderArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={clsx(headerBase, classes)} data-slot="message-header">
		{children}
	</div>
)

/** Delivery status or message actions below the message surface. */
const MessageFooter: Stateless<MessageFooterArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={clsx(footerBase, classes)} data-slot="message-footer">
		{children}
	</div>
)

export {
	Message,
	MessageAvatar,
	MessageContent,
	MessageFooter,
	MessageGroup,
	MessageHeader,
}
