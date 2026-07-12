import type { Stateless } from 'ajo'
import clsx from 'clsx'
import { buttonVariants } from './button'
import type { ButtonSize, ButtonVariant } from './button'
import {
	MessageScroller as BaseMessageScroller,
	MessageScrollerButton as BaseMessageScrollerButton,
	MessageScrollerContent as BaseMessageScrollerContent,
	MessageScrollerItem as BaseMessageScrollerItem,
	MessageScrollerProvider as BaseMessageScrollerProvider,
	MessageScrollerViewport as BaseMessageScrollerViewport,
	useMessageScroller as baseUseMessageScroller,
	useMessageScrollerScrollable as baseUseMessageScrollerScrollable,
	useMessageScrollerVisibility as baseUseMessageScrollerVisibility,
	type MessageScrollerArgs as BaseMessageScrollerArgs,
	type MessageScrollerButtonArgs as BaseMessageScrollerButtonArgs,
	type MessageScrollerContentArgs as BaseMessageScrollerContentArgs,
	type MessageScrollerItemArgs as BaseMessageScrollerItemArgs,
	type MessageScrollerProviderArgs as BaseMessageScrollerProviderArgs,
	type MessageScrollerViewportArgs as BaseMessageScrollerViewportArgs,
} from 'ajo-ui/message-scroller'
export type { MessageScrollerApi, MessageScrollerDefaultPosition, MessageScrollerDirection, MessageScrollerScrollOptions, MessageScrollerScrollable, MessageScrollerVisibility } from 'ajo-ui/message-scroller'

export type MessageScrollerProviderArgs = BaseMessageScrollerProviderArgs
export type MessageScrollerArgs = BaseMessageScrollerArgs & { class?: string }
export type MessageScrollerViewportArgs = BaseMessageScrollerViewportArgs & { class?: string }
export type MessageScrollerContentArgs = BaseMessageScrollerContentArgs & { class?: string }
export type MessageScrollerItemArgs = BaseMessageScrollerItemArgs & { class?: string }
export type MessageScrollerButtonArgs = BaseMessageScrollerButtonArgs & {
	/** Additional UnoCSS classes. */
	class?: string
	/** Button size. */
	size?: ButtonSize
	/** Button variant. */
	variant?: ButtonVariant
}

const rootBase = 'group/message-scroller relative flex size-full min-h-0 flex-col overflow-hidden'
const viewportBase = 'size-full min-h-0 min-w-0 scrollbar-soft scrollbar-gutter-stable overflow-y-auto overscroll-contain contain-content [&[data-autoscrolling]]:scrollbar-none [&[data-autoscrolling]::-webkit-scrollbar]:hidden'
const contentBase = 'flex h-max min-h-full flex-col gap-4'
const itemBase = 'min-w-0 shrink-0 [contain-intrinsic-size:auto_10rem] [content-visibility:auto]'
const buttonBase = 'absolute inset-s-1/2 z-10 -translate-x-1/2 transition-[transform,opacity] duration-200 data-[active=false]:pointer-events-none data-[active=false]:scale-95 data-[active=false]:opacity-0 data-[active=false]:duration-400 data-[active=false]:ease-[cubic-bezier(0.7,0,0.84,0)] data-[active=true]:translate-y-0 data-[active=true]:scale-100 data-[active=true]:opacity-100 data-[active=true]:ease-[cubic-bezier(0.23,1,0.32,1)] data-[direction=end]:bottom-4 data-[direction=end]:data-[active=false]:translate-y-full data-[direction=start]:top-4 data-[direction=start]:data-[active=false]:-translate-y-full rtl:translate-x-1/2'

/** Provides imperative scroll behavior and visibility state to message scroller slots. */
const MessageScrollerProvider: Stateless<MessageScrollerProviderArgs> = ({
	children,
	...attrs
}) => (
	<BaseMessageScrollerProvider
		{...attrs}
		attr:class="contents"
	>
		{children}
	</BaseMessageScrollerProvider>
)

/** Root container for a scroll-managed message transcript. */
const MessageScroller: Stateless<MessageScrollerArgs> = ({ children, class: classes, ...attrs }) => (
	<BaseMessageScroller
		{...attrs}
		class={clsx(rootBase, classes)}
	>
		{children}
	</BaseMessageScroller>
)

/** Keyboard-focusable transcript viewport. */
const MessageScrollerViewport: Stateless<MessageScrollerViewportArgs> = ({
	children,
	class: classes,
	role = 'region',
	tabIndex = 0,
	'aria-label': label = 'Messages',
	...attrs
}) => (
	<BaseMessageScrollerViewport
		{...attrs}
		aria-label={label}
		class={clsx(viewportBase, classes)}
		role={role}
		tabIndex={tabIndex}
	>
		{children}
	</BaseMessageScrollerViewport>
)

/** Live-region content list for rendered messages. */
const MessageScrollerContent: Stateless<MessageScrollerContentArgs> = ({
	children,
	class: classes,
	role = 'log',
	'aria-live': live = 'polite',
	'aria-relevant': relevant = 'additions',
	...attrs
}) => (
	<BaseMessageScrollerContent
		{...attrs}
		aria-live={live}
		aria-relevant={relevant}
		class={clsx(contentBase, classes)}
		role={role}
	>
		{children}
	</BaseMessageScrollerContent>
)

/** One scroll-trackable transcript item. */
const MessageScrollerItem: Stateless<MessageScrollerItemArgs> = ({
	children,
	class: classes,
	messageId,
	scrollAnchor = false,
	...attrs
}) => (
	<BaseMessageScrollerItem
		{...attrs}
		class={clsx(itemBase, classes)}
		messageId={messageId}
		scrollAnchor={scrollAnchor}
	>
		{children}
	</BaseMessageScrollerItem>
)

/** Floating button that jumps to the start or end of the transcript. */
const MessageScrollerButton: Stateless<MessageScrollerButtonArgs> = ({
	'aria-label': label,
	children,
	class: classes,
	direction = 'end',
	disabled,
	size = 'icon-sm',
	type = 'button',
	variant = 'outline',
	'set:onclick': onClick,
	...attrs
}) => {
	const title = label ?? (direction === 'end' ? 'Scroll to end' : 'Scroll to start')

	return (
		<BaseMessageScrollerButton
			{...attrs}
			aria-label={title}
			class={clsx(buttonVariants({ size, variant }), buttonBase, classes)}
			data-size={size}
			data-variant={variant}
			direction={direction}
			disabled={disabled}
			set:onclick={onClick}
			type={type}
		>
			{children ?? (
				<>
					<span aria-hidden="true" class={direction === 'start' ? 'i-lucide-arrow-up size-4' : 'i-lucide-arrow-down size-4'} />
					<span class="sr-only">{title}</span>
				</>
			)}
		</BaseMessageScrollerButton>
	)
}

export {
	MessageScroller,
	MessageScrollerButton,
	MessageScrollerContent,
	MessageScrollerItem,
	MessageScrollerProvider,
	MessageScrollerViewport,
	baseUseMessageScroller as useMessageScroller,
	baseUseMessageScrollerScrollable as useMessageScrollerScrollable,
	baseUseMessageScrollerVisibility as useMessageScrollerVisibility,
}
