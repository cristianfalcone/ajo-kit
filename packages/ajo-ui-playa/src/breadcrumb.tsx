import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'
import { emptyChildren } from 'ajo-ui/utils'

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

export type BreadcrumbSeparatorArgs = WithChildren<IntrinsicElements['li'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

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

/** Ordered breadcrumb item list. */
const BreadcrumbList: Stateless<BreadcrumbListArgs> = ({
	children,
	class: classes,
	...attrs
}) => (
	<ol
		{...attrs}
		class={clsx('flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5', classes)}
		data-slot="breadcrumb-list"
	>
		{children}
	</ol>
)

/** Single breadcrumb list item. */
const BreadcrumbItem: Stateless<BreadcrumbItemArgs> = ({
	children,
	class: classes,
	...attrs
}) => (
	<li
		{...attrs}
		class={clsx('inline-flex items-center gap-1.5', classes)}
		data-slot="breadcrumb-item"
	>
		{children}
	</li>
)

/** Clickable breadcrumb link. */
const BreadcrumbLink: Stateless<BreadcrumbLinkArgs> = ({
	children,
	class: classes,
	...attrs
}) => (
	<a
		{...attrs}
		class={clsx('transition-colors hover:text-foreground', classes)}
		data-slot="breadcrumb-link"
	>
		{children}
	</a>
)

/** Current page marker inside a breadcrumb. */
const BreadcrumbPage: Stateless<BreadcrumbPageArgs> = ({
	children,
	class: classes,
	...attrs
}) => (
	<span
		{...attrs}
		aria-current="page"
		aria-disabled="true"
		class={clsx('font-normal text-foreground', classes)}
		data-slot="breadcrumb-page"
		role="link"
	>
		{children}
	</span>
)

/** Decorative separator between breadcrumb items. */
const BreadcrumbSeparator: Stateless<BreadcrumbSeparatorArgs> = ({
	children,
	class: classes,
	...attrs
}) => (
	<li
		{...attrs}
		aria-hidden="true"
		class={clsx('inline-flex items-center justify-center [&>svg]:size-3.5', classes)}
		data-slot="breadcrumb-separator"
		role="presentation"
	>
		{emptyChildren(children) ? <span aria-hidden="true" class="i-lucide-chevron-right block size-3.5 shrink-0 text-muted-foreground" /> : children}
	</li>
)

/** Collapsed breadcrumb range indicator. */
const BreadcrumbEllipsis: Stateless<BreadcrumbEllipsisArgs> = ({
	class: classes,
	...attrs
}) => (
	<span
		{...attrs}
		aria-hidden="true"
		class={clsx('flex size-9 items-center justify-center', classes)}
		data-slot="breadcrumb-ellipsis"
		role="presentation"
	>
		<span aria-hidden="true" class="i-lucide-ellipsis size-4" />
		<span class="sr-only">More</span>
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
