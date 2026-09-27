import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { callHandler, controlled, dom, hotkey, media } from 'ajo-cloves'
import { context } from 'ajo/context'
import { Drawer, DrawerContent } from './drawer'
import { part } from './utils'
import { rootAttrs } from './shared'

/** Current expanded or collapsed presentation state. */
export type SidebarState = 'collapsed' | 'expanded'
/** Screen edge occupied by the sidebar. */
export type SidebarSide = 'left' | 'right'
/** Layout treatment applied to the sidebar shell. */
export type SidebarVariant = 'floating' | 'inset' | 'sidebar'
/** Behavior used when the desktop sidebar is collapsed. */
export type SidebarCollapsible = 'icon' | 'none' | 'offcanvas'

/** Props for shared desktop and mobile sidebar state. */
export type SidebarProviderArgs = WithChildren<IntrinsicElements['div'] & {
	defaultOpen?: boolean
	/** Controlled desktop open state. `null` and `undefined` both leave it uncontrolled. */
	open?: boolean
	/**
	 * Called with the next open state and the triggering event whenever either
	 * presentation changes: the desktop open state (trigger, shortcut, `setOpen`)
	 * and the mobile drawer (`setOpenMobile`, drawer dismissal) both notify here.
	 * Only the desktop state is controllable through `open`; the mobile drawer
	 * state stays internal. Persist the desktop state from here when needed.
	 */
	onOpenChange?: (open: boolean, event?: Event) => void
	/** Keyboard shortcut that toggles the sidebar. Default `'mod+b'`; pass false to disable (e.g. for static `collapsible="none"` sidebars). */
	shortcut?: string | false
	/** Media query that switches to the mobile presentation. */
	mobileQuery?: string
	class?: string
	style?: string
}>

/** Props for the responsive sidebar shell and its presentation. */
export type SidebarArgs = WithChildren<IntrinsicElements['aside'] & {
	side?: SidebarSide
	variant?: SidebarVariant
	collapsible?: SidebarCollapsible
	class?: string
	/** Classes for the mobile drawer panel, which replace `class` in that presentation. */
	mobileClass?: string
}>

/** Props for a button that toggles the sidebar. */
export type SidebarTriggerArgs = WithChildren<IntrinsicElements['button'] & {
	class?: string
}>

/** Props for the main-content wrapper paired with an inset sidebar. */
export type SidebarInsetArgs = WithChildren<IntrinsicElements['main'] & {
	class?: string
}>

/** Shared props for structural sidebar section wrappers. */
export type SidebarSectionArgs = WithChildren<IntrinsicElements['div'] & {
	class?: string
}>

/** Props for the sidebar header section. */
export type SidebarHeaderArgs = SidebarSectionArgs
/** Props for the sidebar footer section. */
export type SidebarFooterArgs = SidebarSectionArgs
/** Props for the sidebar's scrollable content section. */
export type SidebarContentArgs = SidebarSectionArgs
/** Props for a group of related sidebar controls. */
export type SidebarGroupArgs = SidebarSectionArgs
/** Props for the label that identifies a sidebar group. */
export type SidebarGroupLabelArgs = SidebarSectionArgs
/** Props for the content container inside a sidebar group. */
export type SidebarGroupContentArgs = SidebarSectionArgs

/** Props for an action button associated with a sidebar group. */
export type SidebarGroupActionArgs = WithChildren<IntrinsicElements['button'] & {
	class?: string
}>

/** Props for a list of sidebar menu items. */
export type SidebarMenuArgs = WithChildren<IntrinsicElements['ul'] & {
	class?: string
}>

/** Props for an item in the primary sidebar menu. */
export type SidebarMenuItemArgs = WithChildren<IntrinsicElements['li'] & {
	class?: string
}>

type SidebarMenuButtonBaseArgs = WithChildren<{
	isActive?: boolean
	/** Native title hint shown while the sidebar is collapsed. */
	tooltip?: string
	size?: string
	class?: string
}>

type SidebarMenuButtonAsButton = SidebarMenuButtonBaseArgs & IntrinsicElements['button'] & {
	as?: 'button'
	href?: undefined
}

type SidebarMenuButtonAsAnchor = SidebarMenuButtonBaseArgs & IntrinsicElements['a'] & {
	as: 'a'
	href?: string
}

/** Props for a button or anchor in the primary sidebar menu. */
export type SidebarMenuButtonArgs = SidebarMenuButtonAsAnchor | SidebarMenuButtonAsButton

/** Props for a secondary action attached to a sidebar menu item. */
export type SidebarMenuActionArgs = WithChildren<IntrinsicElements['button'] & {
	class?: string
}>

/** Props for metadata displayed beside a sidebar menu item. */
export type SidebarMenuBadgeArgs = WithChildren<IntrinsicElements['div'] & {
	class?: string
}>

/** Props for a loading placeholder shaped like a sidebar menu item. */
export type SidebarMenuSkeletonArgs = IntrinsicElements['div'] & {
	showIcon?: boolean
	width?: string
	class?: string
}

/** Props for a nested list of sidebar menu items. */
export type SidebarMenuSubArgs = WithChildren<IntrinsicElements['ul'] & {
	class?: string
}>

/** Props for an item in a nested sidebar menu. */
export type SidebarMenuSubItemArgs = WithChildren<IntrinsicElements['li'] & {
	class?: string
}>

/** Props for an anchor in a nested sidebar menu. */
export type SidebarMenuSubButtonArgs = WithChildren<IntrinsicElements['a'] & {
	size?: string
	isActive?: boolean
	class?: string
}>

/** Responsive state and controls shared by Sidebar parts. */
export type SidebarContextValue = {
	isMobile: boolean
	open: boolean
	openMobile: boolean
	setOpen: (open: boolean, event?: Event) => void
	setOpenMobile: (open: boolean, event?: Event) => void
	state: SidebarState
	toggleSidebar: (event?: Event) => void
}

/** Responsive state and controls provided by the nearest SidebarProvider. */
export const SidebarContext = context<SidebarContextValue | null>(null)

const defaultMobileQuery = '(max-width: 767px)'
const defaultShortcut = 'mod+b'

const vars = (style?: string) =>
	['--sidebar-width:16rem', '--sidebar-width-mobile:18rem', '--sidebar-width-icon:3rem', style]
		.filter(Boolean)
		.join(';')

const sidebar = () => {
	const value = SidebarContext()
	if (!value) throw new Error('Sidebar controls must be used within a <SidebarProvider />.')
	return value
}

const SidebarProviderRoot: Stateful<SidebarProviderArgs> = function* ({ defaultOpen = true, open }) {
	let mobileQuery = defaultMobileQuery
	let onOpenChange: SidebarProviderArgs['onOpenChange']
	let shortcut: SidebarProviderArgs['shortcut'] = defaultShortcut
	const mobile = media(this, { query: () => mobileQuery })

	const state = controlled<boolean>(this, {
		fallback: Boolean(open ?? defaultOpen),
		onChange: (next, event) => onOpenChange?.(next, event),
	})

	// The mobile drawer state is never controlled, but it notifies through the
	// same onOpenChange so consumers observe both presentations.
	const mobileState = controlled<boolean>(this, {
		fallback: false,
		onChange: (next, event) => onOpenChange?.(next, event),
	})

	const setOpen = (next: boolean, event?: Event) => state.set(next, event)
	const setOpenMobile = (next: boolean, event?: Event) => mobileState.set(next, event)
	const toggleSidebar = (event?: Event) =>
		mobile.matches ? setOpenMobile(!mobileState.value, event) : setOpen(!state.value, event)

	hotkey(this, {
		keys: () => shortcut || '',
		active: () => shortcut !== false,
		onPress: event => toggleSidebar(event),
	})

	for (const args of this) {
		mobileQuery = args.mobileQuery ?? defaultMobileQuery
		onOpenChange = args.onOpenChange
		shortcut = args.shortcut ?? defaultShortcut
		mobile.sync()

		// Presentation stamp for themes: media queries cannot follow a custom
		// mobileQuery, so presentation-conditional styling keys on this instead
		// of a breakpoint.
		if (dom(this)) this.setAttribute('data-mobile', String(mobile.matches))

		// Leaving the mobile presentation drops the drawer, so an open drawer
		// state must not survive it: re-narrowing would replay showModal() from
		// a passive resize. The reset notifies onOpenChange like any other
		// change, riding a microtask so the notification lands outside this
		// render pass (consumers may re-render ancestors from it, which would
		// re-enter this running generator).
		if (!mobile.matches && mobileState.value) queueMicrotask(() => {
			if (!this.signal.aborted && !mobile.matches && mobileState.value) mobileState.set(false)
		})

		// The sidebar contract treats null as uncontrolled; the clove binds on null.
		const opened = state.sync(args.open != null ? Boolean(args.open) : undefined)

		SidebarContext({
			isMobile: mobile.matches,
			open: opened,
			openMobile: mobileState.value,
			setOpen,
			setOpenMobile,
			state: opened ? 'expanded' : 'collapsed',
			toggleSidebar,
		})

		yield <>{args.children}</>
	}
}


/** Unstyled state provider for the sidebar component family. */
const SidebarProvider: Stateless<SidebarProviderArgs> = ({ style, ...args }) => (
	<SidebarProviderRoot
		{...rootAttrs(args, ['defaultOpen', 'mobileQuery', 'onOpenChange', 'open', 'shortcut'])}
		attr:data-slot="sidebar-wrapper"
		attr:style={vars(style)}
	/>
)

/** Unstyled main sidebar panel. */
const Sidebar: Stateless<SidebarArgs> = ({
	children,
	class: classes,
	collapsible = 'offcanvas',
	mobileClass,
	side = 'left',
	variant = 'sidebar',
	...attrs
}) => {
	const ctx = SidebarContext()
	const state = collapsible === 'none' ? 'expanded' : ctx?.state ?? 'expanded'
	const collapsed = state === 'collapsed' ? collapsible : ''

	if (ctx?.isMobile && collapsible !== 'none') {
		return (
			<Drawer
				onOpenChange={(next, event) => ctx.setOpenMobile(next, event)}
				open={ctx.openMobile}
				side={side}
				// Keeps the Drawer/Dialog wrapper divs out of the provider's flow so
				// the closed drawer occupies no space (the old <dialog> was UA-hidden).
				style="position:fixed"
			>
				<DrawerContent
					{...attrs}
					aria-label={attrs['aria-label'] ?? 'Sidebar'}
					class={mobileClass ?? classes}
					data-mobile="true"
					data-variant={variant}
					data-slot="sidebar"
				>
					<div data-slot="sidebar-inner">
						{children}
					</div>
				</DrawerContent>
			</Drawer>
		)
	}

	return (
		<aside
			{...attrs}
			aria-label={attrs['aria-label'] ?? 'Sidebar'}
			class={classes}
			data-collapsible={collapsed || undefined}
			data-side={side}
			data-slot="sidebar"
			data-state={state}
			data-variant={variant}
		>
			{children}
		</aside>
	)
}

/** Unstyled button that toggles the current SidebarProvider. */
const SidebarTrigger: Stateless<SidebarTriggerArgs> = ({
	'aria-label': label = 'Toggle Sidebar',
	children,
	class: classes,
	type = 'button',
	'set:onclick': onClick,
	...attrs
}) => {
	const ctx = sidebar()

	return (
		<button
			{...attrs}
			aria-label={label}
			class={classes}
			data-slot="sidebar-trigger"
			type={type}
			set:onclick={(event: Event) => {
				callHandler(onClick, event)
				if (!event.defaultPrevented) ctx.toggleSidebar(event)
			}}
		>
			{children}
		</button>
	)
}

/** Unstyled main content wrapper used with inset sidebars. */
const SidebarInset = part<SidebarInsetArgs>('main', 'sidebar-inset')

/** Unstyled container for content at the top of a sidebar. */
const SidebarHeader = part<SidebarSectionArgs>('div', 'sidebar-header')

/** Unstyled container for content at the bottom of a sidebar. */
const SidebarFooter = part<SidebarSectionArgs>('div', 'sidebar-footer')

/** Unstyled container for the sidebar's primary content. */
const SidebarContent = part<SidebarSectionArgs>('div', 'sidebar-content')

/** Unstyled wrapper for a related group of sidebar controls. */
const SidebarGroup = part<SidebarSectionArgs>('div', 'sidebar-group')

/** Unstyled label for a sidebar group. */
const SidebarGroupLabel = part<SidebarSectionArgs>('div', 'sidebar-group-label')

/** Unstyled action button associated with a sidebar group. */
const SidebarGroupAction: Stateless<SidebarGroupActionArgs> = ({ children, class: classes, type = 'button', ...attrs }) => (
	<button
		{...attrs}
		class={classes}
		data-slot="sidebar-group-action"
		type={type}
	>
		{children}
	</button>
)

/** Unstyled content container inside a sidebar group. */
const SidebarGroupContent = part<SidebarSectionArgs>('div', 'sidebar-group-content')

/** Unstyled list for primary sidebar navigation items. */
const SidebarMenu = part<SidebarMenuArgs>('ul', 'sidebar-menu')

/** Unstyled item in the primary sidebar menu. */
const SidebarMenuItem = part<SidebarMenuItemArgs>('li', 'sidebar-menu-item')

/** Unstyled primary sidebar menu control rendered as a button or anchor. */
const SidebarMenuButton: Stateless<SidebarMenuButtonArgs> = ({
	as = 'button',
	children,
	class: classes,
	isActive,
	size = 'default',
	tooltip,
	...attrs
}) => {
	const ctx = SidebarContext()
	const title = tooltip && ctx?.state === 'collapsed' ? tooltip : attrs.title

	if (as === 'a') {
		const anchor = attrs as IntrinsicElements['a']

		return (
			<a
				{...anchor}
				aria-current={isActive ? 'page' : undefined}
				class={classes}
				data-active={isActive ? 'true' : undefined}
				data-size={size}
				data-slot="sidebar-menu-button"
				title={title}
			>
				{children}
			</a>
		)
	}

	const { type = 'button', ...button } = attrs as IntrinsicElements['button']

	return (
		<button
			{...button}
			class={classes}
			data-active={isActive ? 'true' : undefined}
			data-size={size}
			data-slot="sidebar-menu-button"
			title={title}
			type={type}
		>
			{children}
		</button>
	)
}

/** Unstyled secondary action attached to a sidebar menu item. */
const SidebarMenuAction: Stateless<SidebarMenuActionArgs> = ({ children, class: classes, type = 'button', ...attrs }) => (
	<button
		{...attrs}
		class={classes}
		data-slot="sidebar-menu-action"
		type={type}
	>
		{children}
	</button>
)

/** Unstyled metadata badge displayed beside a sidebar menu item. */
const SidebarMenuBadge = part<SidebarMenuBadgeArgs>('div', 'sidebar-menu-badge')

/** Unstyled loading placeholder for a sidebar menu item. */
const SidebarMenuSkeleton: Stateless<SidebarMenuSkeletonArgs> = ({
	class: classes,
	showIcon,
	width = '70%',
	...attrs
}) => (
	<div {...attrs} class={classes} data-slot="sidebar-menu-skeleton">
		{showIcon ? <div data-slot="sidebar-menu-skeleton-icon" /> : null}
		<div data-slot="sidebar-menu-skeleton-text" style={`max-width:${width}`} />
	</div>
)

/** Unstyled nested list within the sidebar menu. */
const SidebarMenuSub = part<SidebarMenuSubArgs>('ul', 'sidebar-menu-sub')

/** Unstyled item in a nested sidebar menu. */
const SidebarMenuSubItem = part<SidebarMenuSubItemArgs>('li', 'sidebar-menu-sub-item')

/** Unstyled anchor for a nested sidebar menu item. */
const SidebarMenuSubButton: Stateless<SidebarMenuSubButtonArgs> = ({
	children,
	class: classes,
	isActive,
	size = 'md',
	...attrs
}) => (
	<a
		{...attrs}
		aria-current={isActive ? 'page' : undefined}
		class={classes}
		data-active={isActive ? 'true' : undefined}
		data-size={size}
		data-slot="sidebar-menu-sub-button"
	>
		{children}
	</a>
)

export {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSkeleton,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarTrigger,
}
