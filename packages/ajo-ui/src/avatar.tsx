import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import { callHandler } from 'ajo-cloves'

/** Arguments for the Avatar root. */
export type AvatarArgs = WithChildren<IntrinsicElements['div'] & {
	/** Size marker mirrored as `data-size`. */
	size?: string
}>

/** Arguments for the native image inside an Avatar. */
export type AvatarImageArgs = IntrinsicElements['img']
/** Arguments for fallback content shown without a usable image. */
export type AvatarFallbackArgs = WithChildren<IntrinsicElements['span']>
/** Arguments for the status badge attached to an Avatar. */
export type AvatarBadgeArgs = WithChildren<IntrinsicElements['span']>
/** Arguments for a visual group of overlapping avatars. */
export type AvatarGroupArgs = WithChildren<IntrinsicElements['div']>
/** Arguments for the overflow count in an Avatar group. */
export type AvatarGroupCountArgs = WithChildren<IntrinsicElements['div']>

/** Unstyled avatar root that exposes image, fallback, and badge slots. */
const Avatar: Stateless<AvatarArgs> = ({
	children,
	size = 'default',
	...attrs
}) => (
	<div
		{...attrs}
		data-size={size}
		data-slot="avatar"
	>
		{children}
	</div>
)

/** Unstyled avatar image that hides itself after load errors. */
const AvatarImage: Stateless<AvatarImageArgs> = ({
	alt = '',
	decoding = 'async',
	loading = 'lazy',
	'set:onerror': onerror,
	'set:onload': onload,
	...attrs
}) => (
	<img
		{...attrs}
		alt={alt}
		data-slot="avatar-image"
		decoding={decoding}
		loading={loading}
		set:onerror={(event: Event | string) => {
			if (event instanceof Event) {
				;(event.currentTarget as HTMLImageElement).hidden = true
				callHandler(onerror, event)
			}
		}}
		set:onload={(event: Event) => {
			;(event.currentTarget as HTMLImageElement).hidden = false
			callHandler(onload, event)
		}}
	/>
)

/** Unstyled fallback content for an Avatar. */
const AvatarFallback: Stateless<AvatarFallbackArgs> = ({ children, ...attrs }) => (
	<span {...attrs} data-slot="avatar-fallback">
		{children}
	</span>
)

/** Unstyled badge anchored to an Avatar. */
const AvatarBadge: Stateless<AvatarBadgeArgs> = ({ children, ...attrs }) => (
	<span {...attrs} data-slot="avatar-badge">
		{children}
	</span>
)

/** Unstyled container for a group of avatars. */
const AvatarGroup: Stateless<AvatarGroupArgs> = ({ children, ...attrs }) => (
	<div {...attrs} data-slot="avatar-group">
		{children}
	</div>
)

/** Unstyled count for avatars omitted from a visible group. */
const AvatarGroupCount: Stateless<AvatarGroupCountArgs> = ({ children, ...attrs }) => (
	<div {...attrs} data-slot="avatar-group-count">
		{children}
	</div>
)

export {
	Avatar,
	AvatarBadge,
	AvatarFallback,
	AvatarGroup,
	AvatarGroupCount,
	AvatarImage,
}
