import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'
import { buttonVariants, type ButtonSize, type ButtonVariant } from './button'

export type AttachmentState = 'done' | 'error' | 'idle' | 'processing' | 'uploading'

export type AttachmentSize = 'default' | 'sm' | 'xs'

export type AttachmentOrientation = 'horizontal' | 'vertical'

export type AttachmentMediaVariant =
	| 'icon'
	| 'image'

export type AttachmentArgs = WithChildren<IntrinsicElements['div'] & {
	/** Upload lifecycle state. Drives border, text, and shimmer styling. */
	state?: AttachmentState
	/** Visual size. */
	size?: AttachmentSize
	/** Layout direction. */
	orientation?: AttachmentOrientation
	/** Additional UnoCSS classes. */
	class?: string
}>

export type AttachmentMediaArgs = WithChildren<IntrinsicElements['div'] & {
	/** Media treatment for icons or image previews. */
	variant?: AttachmentMediaVariant
	/** Additional UnoCSS classes. */
	class?: string
}>

export type AttachmentSlotArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
	/** Slot marker for composed attachment variants. */
	'data-slot'?: string
}>

export type AttachmentTextArgs = WithChildren<IntrinsicElements['span'] & {
	/** Additional UnoCSS classes. */
	class?: string
	/** Slot marker for composed attachment text variants. */
	'data-slot'?: string
}>

export type AttachmentActionArgs = WithChildren<IntrinsicElements['button'] & {
	/** Button size. */
	size?: ButtonSize
	/** Button variant. */
	variant?: ButtonVariant
	/** Additional UnoCSS classes. */
	class?: string
}>

type AttachmentTriggerBaseArgs = WithChildren<{
	/** Render the trigger as a button or anchor. */
	as?: 'a' | 'button'
	/** Additional UnoCSS classes. */
	class?: string
}>

type AttachmentTriggerButtonArgs = AttachmentTriggerBaseArgs & IntrinsicElements['button'] & {
	as?: 'button'
	href?: undefined
}

type AttachmentTriggerAnchorArgs = AttachmentTriggerBaseArgs & IntrinsicElements['a'] & {
	as: 'a'
	href: string
}

export type AttachmentTriggerArgs =
	| AttachmentTriggerAnchorArgs
	| AttachmentTriggerButtonArgs

export type AttachmentGroupArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

const rootBase = [
	'group/attachment relative flex w-fit max-w-full min-w-0 shrink-0 flex-wrap rounded-xl glass edge shadow-xs transition-colors',
	'focus-within:ring-1 focus-within:ring-ring/50 has-[>a,>button]:hover:bg-muted/50',
	'data-[state=error]:inset-ring-danger/25 data-[state=idle]:inset-ring-transparent data-[state=idle]:border data-[state=idle]:border-dashed',
].join(' ')

const rootSizes: Record<AttachmentSize, string> = {
	default: 'gap-2 text-sm has-data-[slot=attachment-content]:px-2.5 has-data-[slot=attachment-content]:py-2 has-data-[slot=attachment-media]:p-2',
	sm: 'gap-2 text-xs has-data-[slot=attachment-content]:px-2 has-data-[slot=attachment-content]:py-1.5 has-data-[slot=attachment-media]:p-1.5',
	xs: 'gap-1.5 rounded-lg text-xs has-data-[slot=attachment-content]:px-1.5 has-data-[slot=attachment-content]:py-1 has-data-[slot=attachment-media]:p-1',
}

const rootOrientations: Record<AttachmentOrientation, string> = {
	horizontal: 'min-w-40 items-center',
	vertical: 'w-24 flex-col has-data-[slot=attachment-content]:w-30',
}

const mediaBase = [
	'relative flex aspect-square w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-foreground',
	'group-data-[orientation=vertical]/attachment:w-full group-data-[size=sm]/attachment:w-8 group-data-[size=xs]/attachment:w-7 group-data-[size=xs]/attachment:rounded-md',
	'group-data-[state=error]/attachment:bg-danger/10 group-data-[state=error]/attachment:text-danger',
	'[&_svg]:pointer-events-none [&_svg:not([class*=size-])]:size-4',
	'group-data-[orientation=vertical]/attachment:[&_svg:not([class*=size-])]:size-6 group-data-[size=xs]/attachment:[&_svg:not([class*=size-])]:size-3.5',
].join(' ')

const mediaVariants: Record<AttachmentMediaVariant, string> = {
	icon: '',
	image: 'opacity-60 group-data-[state=done]/attachment:opacity-100 group-data-[state=idle]/attachment:opacity-100 [&>img]:aspect-square [&>img]:size-full [&>img]:object-cover',
}

const contentBase = 'max-w-full min-w-0 flex-1 leading-tight group-data-[orientation=vertical]/attachment:px-1'
const titleBase = 'block max-w-full min-w-0 truncate font-medium'
const descriptionBase = 'mt-0.5 block max-w-full min-w-0 truncate text-xs text-muted-foreground group-data-[state=error]/attachment:text-danger/80'
const actionsBase = 'relative z-20 flex shrink-0 items-center group-data-[orientation=vertical]/attachment:absolute group-data-[orientation=vertical]/attachment:right-3 group-data-[orientation=vertical]/attachment:top-3 group-data-[orientation=vertical]/attachment:gap-1'
const triggerBase = 'absolute inset-0 z-10 outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
// `items-start` keeps mixed-orientation tiles at their natural heights; the
// horizontal padding matches the 1rem scroll-fade mask so resting first/last
// items sit fully outside the faded edges.
const groupBase = 'flex min-w-0 items-start scroll-fade-x snap-x snap-mandatory scroll-px-4 scrollbar-none gap-3 overflow-x-auto overscroll-x-contain px-4 py-1 [&>[data-slot=attachment]]:flex-none [&>[data-slot=attachment]]:snap-start'

/** Root attachment container for files, images, upload rows, and chat attachments. */
const Attachment: Stateless<AttachmentArgs> = ({
	children,
	class: classes,
	orientation = 'horizontal',
	size = 'default',
	state = 'done',
	...attrs
}) => (
	<div
		{...attrs}
		class={clsx(rootBase, rootSizes[size], rootOrientations[orientation], classes)}
		data-orientation={orientation}
		data-size={size}
		data-slot="attachment"
		data-state={state}
	>
		{children}
	</div>
)

/** Media slot for icons, thumbnails, or image previews. */
const AttachmentMedia: Stateless<AttachmentMediaArgs> = ({
	children,
	class: classes,
	variant = 'icon',
	...attrs
}) => (
	<div
		{...attrs}
		class={clsx(mediaBase, mediaVariants[variant], classes)}
		data-slot="attachment-media"
		data-variant={variant}
	>
		{children}
	</div>
)

/** Content slot wrapping title and description. */
const AttachmentContent: Stateless<AttachmentSlotArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={clsx(contentBase, classes)} data-slot="attachment-content">
		{children}
	</div>
)

/** Attachment display name. */
const AttachmentTitle: Stateless<AttachmentTextArgs> = ({ children, class: classes, ...attrs }) => (
	<span {...attrs} class={clsx(titleBase, classes)} data-slot="attachment-title">
		{children}
	</span>
)

/** Secondary metadata such as type, size, upload status, or error reason. */
const AttachmentDescription: Stateless<AttachmentTextArgs> = ({ children, class: classes, ...attrs }) => (
	<span {...attrs} class={clsx(descriptionBase, classes)} data-slot="attachment-description">
		{children}
	</span>
)

/** Action container aligned to the edge of the attachment. */
const AttachmentActions: Stateless<AttachmentSlotArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={clsx(actionsBase, classes)} data-slot="attachment-actions">
		{children}
	</div>
)

/** Icon-sized action button for attachment operations. */
const AttachmentAction: Stateless<AttachmentActionArgs> = ({
	children,
	class: classes,
	size = 'icon-xs',
	type = 'button',
	variant = 'ghost',
	...attrs
}) => (
	<button
		{...attrs}
		class={buttonVariants({ class: classes, size, variant })}
		data-size={size}
		data-slot="attachment-action"
		data-variant={variant}
		type={type}
	>
		{children}
	</button>
)

/** Full-card trigger layered behind actions. */
const AttachmentTrigger: Stateless<AttachmentTriggerArgs> = ({
	as = 'button',
	children,
	class: classes,
	type = 'button',
	...attrs
}) => {
	const styles = clsx(triggerBase, classes)

	if (as === 'a') {
		const anchor = attrs as IntrinsicElements['a']
		return (
			<a {...anchor} class={styles} data-slot="attachment-trigger" href={String(anchor.href)}>
				{children}
			</a>
		)
	}

	const button = attrs as IntrinsicElements['button']
	return (
		<button {...button} class={styles} data-slot="attachment-trigger" type={type}>
			{children}
		</button>
	)
}

/** Horizontally scrollable attachment row with snap points and edge fade. */
const AttachmentGroup: Stateless<AttachmentGroupArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={clsx(groupBase, classes)} data-slot="attachment-group">
		{children}
	</div>
)

export {
	Attachment,
	AttachmentAction,
	AttachmentActions,
	AttachmentContent,
	AttachmentDescription,
	AttachmentGroup,
	AttachmentMedia,
	AttachmentTitle,
	AttachmentTrigger,
}
