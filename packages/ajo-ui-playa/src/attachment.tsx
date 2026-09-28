import type { Args, IntrinsicElements, Stateless, WithChildren } from 'ajo'
import { clx, part } from 'ajo-ui/utils'
import { Button, type ButtonSize, type ButtonVariant } from './button'

export type AttachmentState = 'done' | 'error' | 'idle' | 'processing' | 'uploading'

export type AttachmentSize = 'default' | 'sm' | 'xs'

export type AttachmentOrientation = 'horizontal' | 'vertical'

export type AttachmentMediaVariant =
	| 'icon'
	| 'image'

export type AttachmentArgs = WithChildren<IntrinsicElements['div'] & {
	/** Upload lifecycle state. Drives border, text, and shimmering title styling. */
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
	'group/attachment relative flex w-fit max-w-full min-w-0 shrink-0 flex-wrap rounded-lg panel transition-colors',
	'has-[>a,>button]:hover:bg-muted/50',
	'data-[state=error]:inset-ring-danger/25 data-[state=idle]:inset-ring-transparent data-[state=idle]:border data-[state=idle]:border-dashed',
].join(' ')

const rootSizes: Record<AttachmentSize, string> = {
	default: 'gap-2 text-sm has-data-[slot=attachment-content]:px-3 has-data-[slot=attachment-content]:py-2 has-data-[slot=attachment-media]:p-2',
	sm: 'gap-2 text-xs has-data-[slot=attachment-content]:px-2 has-data-[slot=attachment-content]:py-1 has-data-[slot=attachment-media]:p-1',
	xs: 'gap-1 rounded-md text-xs has-data-[slot=attachment-content]:px-2 has-data-[slot=attachment-content]:py-1 has-data-[slot=attachment-media]:p-1',
}

const rootOrientations: Record<AttachmentOrientation, string> = {
	horizontal: 'min-w-40 items-center',
	vertical: 'w-24 flex-col has-data-[slot=attachment-content]:w-30',
}

// Media radii step down with the tile so thumbnails stay rounded squares
// (16px on a 32px tile would clip them into circles).
const mediaBase = [
	'relative flex aspect-square w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-foreground',
	'group-data-[orientation=vertical]/attachment:w-full group-data-[size=sm]/attachment:w-8 group-data-[size=sm]/attachment:rounded-sm group-data-[size=xs]/attachment:w-7 group-data-[size=xs]/attachment:rounded-sm',
	'group-data-[state=error]/attachment:bg-danger/10 group-data-[state=error]/attachment:text-danger',
	'[&_svg]:pointer-events-none [&_svg:not([class*=size-])]:size-4',
	'group-data-[orientation=vertical]/attachment:[&_svg:not([class*=size-])]:size-6 group-data-[size=xs]/attachment:[&_svg:not([class*=size-])]:size-3.5',
].join(' ')

const mediaVariants: Record<AttachmentMediaVariant, string> = {
	icon: '',
	image: 'opacity-60 group-data-[state=done]/attachment:opacity-100 group-data-[state=idle]/attachment:opacity-100 [&>img]:aspect-square [&>img]:size-full [&>img]:object-cover',
}

const contentBase = 'max-w-full min-w-0 flex-1 group-data-[orientation=vertical]/attachment:px-1'
// Uploading and processing titles get a shimmering sweep; the preset holds the motion back under reduced motion.
const titleBase = 'block max-w-full min-w-0 truncate font-medium group-data-[state=uploading]/attachment:shimmer group-data-[state=processing]/attachment:shimmer'
const descriptionBase = 'block max-w-full min-w-0 truncate text-xs text-muted-foreground group-data-[state=error]/attachment:text-danger'
const actionsBase = 'relative z-20 flex shrink-0 items-center group-data-[orientation=vertical]/attachment:absolute group-data-[orientation=vertical]/attachment:end-3 group-data-[orientation=vertical]/attachment:top-3 group-data-[orientation=vertical]/attachment:gap-1'
// The whole tile is the trigger, so its ring lies on the tile's hairline.
const triggerBase = 'absolute inset-0 z-10 rounded-[inherit] playa-focus [--focus-offset:calc(var(--focus-width)/-2)]'
// `items-start` keeps mixed-orientation tiles at their natural heights; the
// horizontal padding matches the 1rem scroll-fade mask so resting first/last
// items sit fully outside the faded edges.
const groupBase = 'flex min-w-0 items-start scroll-fade-x snap-x snap-mandatory scroll-px-4 scrollbar-none gap-3 overflow-x-auto overscroll-x-contain px-4 py-1 [&>[data-slot=attachment]]:flex-none [&>[data-slot=attachment]]:snap-start'

/** Root attachment container for files, images, upload rows, and chat attachments. */
const Attachment: Stateless<AttachmentArgs> = ({
	class: classes,
	orientation = 'horizontal',
	size = 'default',
	state = 'done',
	...attrs
}) => (
	<div
		{...attrs}
		class={clx(rootBase, rootSizes[size], rootOrientations[orientation], classes)}
		data-orientation={orientation}
		data-size={size}
		data-slot="attachment"
		data-state={state}
	/>
)

/** Media slot for icons, thumbnails, or image previews. */
const AttachmentMedia: Stateless<AttachmentMediaArgs> = ({ class: classes, variant = 'icon', ...attrs }) => (
	<div {...attrs} class={clx(mediaBase, mediaVariants[variant], classes)} data-slot="attachment-media" data-variant={variant} />
)

/** Content slot wrapping title and description. */
const AttachmentContent = part<AttachmentSlotArgs>('div', 'attachment-content', { class: contentBase })

/** Attachment display name. */
const AttachmentTitle = part<AttachmentTextArgs>('span', 'attachment-title', { class: titleBase })

/** Secondary metadata such as type, size, upload status, or error reason. */
const AttachmentDescription = part<AttachmentTextArgs>('span', 'attachment-description', { class: descriptionBase })

/** Action container aligned to the end of the attachment. */
const AttachmentActions = part<AttachmentSlotArgs>('div', 'attachment-actions', { class: actionsBase })

/** Icon-sized action button for attachment operations. */
const AttachmentAction: Stateless<AttachmentActionArgs> = ({ size = 'icon-xs', type = 'button', variant = 'ghost', ...attrs }) => (
	<Button {...attrs} data-slot="attachment-action" size={size} type={type} variant={variant} />
)

/** Full-card trigger layered behind actions. */
const AttachmentTrigger: Stateless<AttachmentTriggerArgs> = ({
	as: Tag = 'button',
	class: classes,
	type = 'button',
	...attrs
}) => (
	<Tag
		{...(attrs as Args)}
		class={clx(triggerBase, classes)}
		data-slot="attachment-trigger"
		type={Tag === 'button' ? type : undefined}
	/>
)

/** Horizontally scrollable attachment row with snap points and faded ends. */
const AttachmentGroup = part<AttachmentGroupArgs>('div', 'attachment-group', { class: groupBase })

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
