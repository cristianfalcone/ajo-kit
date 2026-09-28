import type { Stateless } from 'ajo'
import { clx } from 'ajo-ui/utils'
import {
	Avatar as BaseAvatar,
	AvatarBadge as BaseAvatarBadge,
	AvatarFallback as BaseAvatarFallback,
	AvatarGroup as BaseAvatarGroup,
	AvatarGroupCount as BaseAvatarGroupCount,
	AvatarImage as BaseAvatarImage,
	type AvatarArgs as BaseAvatarArgs,
	type AvatarBadgeArgs as BaseAvatarBadgeArgs,
	type AvatarFallbackArgs as BaseAvatarFallbackArgs,
	type AvatarGroupArgs as BaseAvatarGroupArgs,
	type AvatarGroupCountArgs as BaseAvatarGroupCountArgs,
	type AvatarImageArgs as BaseAvatarImageArgs,
} from 'ajo-ui/avatar'

export type AvatarSize =
	| 'default'
	| 'lg'
	| 'sm'

export type AvatarArgs = BaseAvatarArgs & {
	/** Avatar size. */
	size?: AvatarSize
	/** Additional UnoCSS classes. */
	class?: string
}

export type AvatarImageArgs = BaseAvatarImageArgs & {
	/** Additional UnoCSS classes. */
	class?: string
}

export type AvatarFallbackArgs = BaseAvatarFallbackArgs & {
	/** Additional UnoCSS classes. */
	class?: string
}

export type AvatarBadgeArgs = BaseAvatarBadgeArgs & {
	/** Additional UnoCSS classes. */
	class?: string
}

export type AvatarGroupArgs = BaseAvatarGroupArgs & {
	/** Additional UnoCSS classes. */
	class?: string
}

export type AvatarGroupCountArgs = BaseAvatarGroupCountArgs & {
	/** Additional UnoCSS classes. */
	class?: string
}

const avatarBase = 'group/avatar relative flex size-8 shrink-0 rounded-full select-none data-[size=lg]:size-10 data-[size=sm]:size-6'
const imageBase = 'absolute inset-0 aspect-square size-full rounded-full object-cover'
// Initials are a label, not an action: the raised surface with a hairline.
// Caption size keeps two letters clear of a grouped neighbour's overlap.
const fallbackBase = 'flex size-full items-center justify-center rounded-full bg-secondary edge text-xs text-secondary-foreground group-data-[size=lg]/avatar:text-sm'
const badgeBase = [
	'absolute bottom-0 end-0 z-10 inline-flex items-center justify-center rounded-full bg-foreground text-background ring-2 ring-background select-none',
	// Empty badge renders as a status dot sized to the avatar.
	'[&:not(:has(>*))]:size-2.5 group-data-[size=sm]/avatar:[&:not(:has(>*))]:size-2 group-data-[size=lg]/avatar:[&:not(:has(>*))]:size-3',
	// A badge with content (icon span or svg) grows to fit it; too small on sm.
	'[&:has(>*)]:size-4 group-data-[size=lg]/avatar:[&:has(>*)]:size-5 group-data-[size=sm]/avatar:[&:has(>*)]:hidden',
	'[&>*]:size-2.5 group-data-[size=lg]/avatar:[&>*]:size-3',
].join(' ')
// Grouped avatars overlap by 6 px inside a page-coloured ring that separates them.
const groupBase = 'group/avatar-group flex -space-x-1.5 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background'
const groupCountBase = 'relative flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary edge text-xs text-muted-foreground ring-2 ring-background [[data-slot=avatar-group]:has([data-size=lg])_&]:size-10 [[data-slot=avatar-group]:has([data-size=lg])_&]:text-sm [[data-slot=avatar-group]:has([data-size=sm])_&]:size-6 [&>svg]:size-4 [[data-slot=avatar-group]:has([data-size=lg])_&>svg]:size-5 [[data-slot=avatar-group]:has([data-size=sm])_&>svg]:size-3'

/** Avatar root that wraps image, fallback, and optional badge. */
const Avatar: Stateless<AvatarArgs> = ({
	children,
	class: classes,
	size = 'default',
	...attrs
}) => (
	<BaseAvatar
		{...attrs}
		class={clx(avatarBase, classes)}
		size={size}
	>
		{children}
	</BaseAvatar>
)

/** Avatar image. It hides itself after load errors so the fallback remains visible. */
const AvatarImage: Stateless<AvatarImageArgs> = ({
	class: classes,
	...attrs
}) => (
	<BaseAvatarImage
		{...attrs}
		class={clx(imageBase, classes)}
	/>
)

/** Avatar fallback content shown behind the image and after image errors. */
const AvatarFallback: Stateless<AvatarFallbackArgs> = ({ children, class: classes, ...attrs }) => (
	<BaseAvatarFallback {...attrs} class={clx(fallbackBase, classes)}>
		{children}
	</BaseAvatarFallback>
)

/** Small status badge at the bottom end corner of an avatar. */
const AvatarBadge: Stateless<AvatarBadgeArgs> = ({ children, class: classes, ...attrs }) => (
	<BaseAvatarBadge {...attrs} class={clx(badgeBase, classes)}>
		{children}
	</BaseAvatarBadge>
)

/** Overlapping avatar group. */
const AvatarGroup: Stateless<AvatarGroupArgs> = ({ children, class: classes, ...attrs }) => (
	<BaseAvatarGroup {...attrs} class={clx(groupBase, classes)}>
		{children}
	</BaseAvatarGroup>
)

/** Count avatar for extra members in an avatar group. */
const AvatarGroupCount: Stateless<AvatarGroupCountArgs> = ({ children, class: classes, ...attrs }) => (
	<BaseAvatarGroupCount {...attrs} class={clx(groupCountBase, classes)}>
		{children}
	</BaseAvatarGroupCount>
)

export {
	Avatar,
	AvatarBadge,
	AvatarFallback,
	AvatarGroup,
	AvatarGroupCount,
	AvatarImage,
}
