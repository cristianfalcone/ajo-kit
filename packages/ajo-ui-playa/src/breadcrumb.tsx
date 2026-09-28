import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import { clx, part } from 'ajo-ui/utils'
import { emptyChildren } from './internal/recipes'

export type BreadcrumbArgs = WithChildren<IntrinsicElements['nav'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type BreadcrumbListArgs = WithChildren<IntrinsicElements['ol'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type BreadcrumbItemArgs = WithChildren<IntrinsicElements['li'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type BreadcrumbLinkArgs = WithChildren<IntrinsicElements['a'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type BreadcrumbPageArgs = WithChildren<IntrinsicElements['span'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type BreadcrumbSeparatorArgs = BreadcrumbItemArgs

export type BreadcrumbEllipsisArgs = IntrinsicElements['span'] & {
	/** Additional UnoCSS classes. */
	class?: string
}

/** Landmark wrapper for breadcrumb navigation. */
const Breadcrumb: Stateless<BreadcrumbArgs> = ({
	children,
	'aria-label': ariaLabel = 'breadcrumb',
	class: classes,
	...attrs
}) => (
	<nav
		{...attrs}
		aria-label={ariaLabel}
		class={classes}
		data-slot="breadcrumb"
	>
		{children}
	</nav>
)

// The trail is inline text. A separator does not wrap, except at the
// zero-width space that opens it, so a wrapped trail never ends a line on a
// separator: the separator moves down with the item it leads to.

/** Ordered breadcrumb item list. */
const BreadcrumbList = part<BreadcrumbListArgs>('ol', 'breadcrumb-list', { class: 'break-words text-sm text-muted-foreground' })

/** Single breadcrumb list item. */
const BreadcrumbItem = part<BreadcrumbItemArgs>('li', 'breadcrumb-item', { class: 'inline' })

// Links and the page keep a step of padding beside their letters, so the one
// focus ring, flush outside the box, never touches them. The padding is the
// gap around each separator, and every fragment of a wrapped title keeps it,
// so its lines start together.

/** Clickable breadcrumb link. */
const BreadcrumbLink = part<BreadcrumbLinkArgs>('a', 'breadcrumb-link', { class: 'rounded-xs px-1 box-decoration-clone transition-colors playa-focus hover:text-foreground' })

/** Current page marker inside a breadcrumb. */
const BreadcrumbPage = part<BreadcrumbPageArgs>('span', 'breadcrumb-page', {
	'aria-current': 'page',
	'aria-disabled': 'true',
	class: 'px-1 box-decoration-clone font-normal text-foreground',
	role: 'link',
})

/** Decorative separator between breadcrumb items; the default chevron points along the reading direction. */
const BreadcrumbSeparator: Stateless<BreadcrumbSeparatorArgs> = ({
	children,
	class: classes,
	...attrs
}) => (
	<li
		{...attrs}
		aria-hidden="true"
		class={clx('inline whitespace-nowrap [&>svg]:size-3.5', classes)}
		data-slot="breadcrumb-separator"
		role="presentation"
	>
		<span class="whitespace-normal">{'\u200B'}</span>
		{emptyChildren(children) ? <span aria-hidden="true" class="i-lucide-chevron-right size-3.5 align-middle text-muted-foreground rtl:-scale-x-100" /> : children}
	</li>
)

/** Collapsed breadcrumb range indicator, hidden from assistive technology and sized to its glyph. */
const BreadcrumbEllipsis: Stateless<BreadcrumbEllipsisArgs> = ({ class: classes, ...attrs }) => (
	<span
		{...attrs}
		aria-hidden="true"
		class={clx('inline-flex size-4 align-middle', classes)}
		data-slot="breadcrumb-ellipsis"
		role="presentation"
	>
		<span class="i-lucide-ellipsis size-4" />
	</span>
)

export {
	Breadcrumb,
	BreadcrumbEllipsis,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
}
