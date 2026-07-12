import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { browser, callHandler, controlled, dom, hotkey, media, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'
import { Drawer, DrawerContent } from './drawer'

export type SidebarState = 'collapsed' | 'expanded'
export type SidebarSide = 'left' | 'right'
export type SidebarVariant = 'floating' | 'inset' | 'sidebar'
export type SidebarCollapsible = 'icon' | 'none' | 'offcanvas'

export type SidebarProviderArgs = WithChildren<IntrinsicElements['div'] & {
	defaultOpen?: boolean
	/** Controlled desktop open state. `null` and `undefined` both leave it uncontrolled. */
	open?: boolean
	/**
	 * Called with the next open state and the triggering event whenever either
	 * presentation changes: the desktop open state (trigger, rail, shortcut,
	 * `setOpen`) and the mobile drawer (`setOpenMobile`, drawer dismissal) both
	 * notify here. Only the desktop state is controllable through `open`; the
	 * mobile drawer state stays internal.
	 */
	onOpenChange?: (open: boolean, event?: Event) => void
	/**
	 * Persists the desktop open state; the default writes the `sidebar_state`
	 * cookie. Pass false to disable. The cookie is write-only today — reading it
	 * back into `defaultOpen` (kit SSR loader) is a recorded follow-up.
	 */
	persist?: false | ((open: boolean) => void)
	/** Keyboard shortcut that toggles the sidebar. Default `'mod+b'`; pass false to disable (e.g. for static `collapsible="none"` sidebars). */
	shortcut?: string | false
	/** Media query that switches to the mobile presentation. */
	mobileQuery?: string
	class?: string
	style?: string
}>

export type SidebarArgs = WithChildren<IntrinsicElements['aside'] & {
	side?: SidebarSide
	variant?: SidebarVariant
	collapsible?: SidebarCollapsible
	class?: string
	mobileClass?: string
	mobileContentClass?: string
}>

export type SidebarTriggerArgs = WithChildren<IntrinsicElements['button'] & {
	class?: string
}>

export type SidebarRailArgs = IntrinsicElements['button'] & {
	class?: string
}

export type SidebarInsetArgs = WithChildren<IntrinsicElements['main'] & {
	class?: string
}>

export type SidebarInputArgs = IntrinsicElements['input'] & {
	class?: string
}

export type SidebarSeparatorArgs = IntrinsicElements['div'] & {
	class?: string
}

export type SidebarSectionArgs = WithChildren<IntrinsicElements['div'] & {
	class?: string
}>

export type SidebarHeaderArgs = SidebarSectionArgs
export type SidebarFooterArgs = SidebarSectionArgs
export type SidebarContentArgs = SidebarSectionArgs
export type SidebarGroupArgs = SidebarSectionArgs
export type SidebarGroupLabelArgs = SidebarSectionArgs
export type SidebarGroupContentArgs = SidebarSectionArgs

export type SidebarGroupActionArgs = WithChildren<IntrinsicElements['button'] & {
	class?: string
}>

export type SidebarMenuArgs = WithChildren<IntrinsicElements['ul'] & {
	class?: string
}>

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

export type SidebarMenuButtonArgs = SidebarMenuButtonAsAnchor | SidebarMenuButtonAsButton

export type SidebarMenuActionArgs = WithChildren<IntrinsicElements['button'] & {
	class?: string
}>

export type SidebarMenuBadgeArgs = WithChildren<IntrinsicElements['div'] & {
	class?: string
}>

export type SidebarMenuSkeletonArgs = IntrinsicElements['div'] & {
	showIcon?: boolean
	width?: string
	iconClass?: string
	textClass?: string
	class?: string
}

export type SidebarMenuSubArgs = WithChildren<IntrinsicElements['ul'] & {
	class?: string
}>

export type SidebarMenuSubItemArgs = WithChildren<IntrinsicElements['li'] & {
	class?: string
}>

export type SidebarMenuSubButtonArgs = WithChildren<IntrinsicElements['a'] & {
	size?: string
	isActive?: boolean
	class?: string
}>

type SidebarContextValue = {
	isMobile: boolean
	open: boolean
	openMobile: boolean
	setOpen: (open: boolean, event?: Event) => void
	setOpenMobile: (open: boolean, event?: Event) => void
	state: SidebarState
	toggleSidebar: (event?: Event) => void
}

const SidebarContext = context<SidebarContextValue | null>(null)

const cookie = 'sidebar_state'
const cookieMaxAge = 60 * 60 * 24 * 7
const defaultMobileQuery = '(max-width: 767px)'
const defaultShortcut = 'mod+b'

const vars = (style?: string) =>
	['--sidebar-width:16rem', '--sidebar-width-mobile:18rem', '--sidebar-width-icon:3rem', style]
		.filter(Boolean)
		.join(';')

const writeCookie = (open: boolean) => {
	if (!browser()) return
	document.cookie = `${cookie}=${open}; path=/; max-age=${cookieMaxAge}`
}

const sidebar = () => {
	const value = SidebarContext()
	if (!value) throw new Error('useSidebar must be used within a SidebarProvider.')
	return value
}

/** Returns the nearest SidebarProvider state, throwing when used outside a provider. */
export const useSidebar = sidebar

const SidebarProviderRoot: Stateful<SidebarProviderArgs> = function* ({ defaultOpen = true, open }) {
	let mobileQuery = defaultMobileQuery
	let onOpenChange: SidebarProviderArgs['onOpenChange']
	let persist: SidebarProviderArgs['persist']
	let shortcut: SidebarProviderArgs['shortcut'] = defaultShortcut
	const mobile = media(this, () => mobileQuery)

	const state = controlled<boolean>(this, {
		fallback: Boolean(open ?? defaultOpen),
		onChange: (next, event) => {
			onOpenChange?.(next, event)
			if (persist !== false) (persist ?? writeCookie)(next)
		},
	})

	// The mobile drawer state is never controlled and never persisted, but it
	// notifies through the same onOpenChange so consumers observe both presentations.
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
		persist = args.persist
		shortcut = args.shortcut ?? defaultShortcut
		mobile.sync()

		// Presentation stamp for themes: media queries cannot follow a custom
		// mobileQuery, so presentation-conditional styling (e.g. hiding the
		// rail inside the drawer) keys on this instead of a breakpoint.
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
const SidebarProvider: Stateless<SidebarProviderArgs> = ({
	children,
	class: classes,
	defaultOpen,
	mobileQuery,
	onOpenChange,
	open,
	persist,
	shortcut,
	style,
	...attrs
}) => (
	<SidebarProviderRoot
		{...rootAttrs(attrs)}
		defaultOpen={defaultOpen}
		mobileQuery={mobileQuery}
		onOpenChange={onOpenChange}
		open={open}
		persist={persist}
		shortcut={shortcut}
		attr:class={classes}
		attr:data-slot="sidebar-wrapper"
		attr:style={vars(style)}
	>
		{children}
	</SidebarProviderRoot>
)

/** Unstyled main sidebar panel. */
const Sidebar: Stateless<SidebarArgs> = ({
	children,
	class: classes,
	collapsible = 'offcanvas',
	mobileClass,
	mobileContentClass,
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
					showCloseButton={false}
					// DrawerContent pins data-slot="drawer-content" after its spread;
					// reclaim the slot themes rely on. Ajo skips unchanged attr writes
					// and re-runs refs each render, so the value survives updates.
					ref={(element: HTMLDialogElement | null) => element?.setAttribute('data-slot', 'sidebar')}
				>
					<div class={mobileContentClass}>
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

/** Toggles the nearest SidebarProvider unless a caller-supplied click handler prevented default. */
const toggleClick = (ctx: SidebarContextValue, onClick: unknown) => (event: Event) => {
	callHandler(onClick, event)
	if (!event.defaultPrevented) ctx.toggleSidebar(event)
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
			data-sidebar="trigger"
			data-slot="sidebar-trigger"
			type={type}
			set:onclick={toggleClick(ctx, onClick)}
		>
			{children}
		</button>
	)
}

/** Unstyled rail hit area used to collapse or expand a sidebar. */
const SidebarRail: Stateless<SidebarRailArgs> = ({
	'aria-label': label = 'Toggle Sidebar',
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
			data-sidebar="rail"
			data-slot="sidebar-rail"
			tabindex="-1"
			title={label}
			type={type}
			set:onclick={toggleClick(ctx, onClick)}
		/>
	)
}

/** Unstyled main content wrapper used with inset sidebars. */
const SidebarInset: Stateless<SidebarInsetArgs> = ({ children, class: classes, ...attrs }) => (
	<main
		{...attrs}
		class={classes}
		data-slot="sidebar-inset"
	>
		{children}
	</main>
)

const SidebarInput: Stateless<SidebarInputArgs> = ({ class: classes, ...attrs }) => (
	<input {...attrs} class={classes} data-sidebar="input" data-slot="sidebar-input" />
)

const SidebarHeader: Stateless<SidebarSectionArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={classes} data-sidebar="header" data-slot="sidebar-header">
		{children}
	</div>
)

const SidebarFooter: Stateless<SidebarSectionArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={classes} data-sidebar="footer" data-slot="sidebar-footer">
		{children}
	</div>
)

const SidebarSeparator: Stateless<SidebarSeparatorArgs> = ({ class: classes, ...attrs }) => (
	<div
		{...attrs}
		aria-hidden="true"
		class={classes}
		data-sidebar="separator"
		data-slot="sidebar-separator"
		role="none"
	/>
)

const SidebarContent: Stateless<SidebarSectionArgs> = ({ children, class: classes, ...attrs }) => (
	<div
		{...attrs}
		class={classes}
		data-sidebar="content"
		data-slot="sidebar-content"
	>
		{children}
	</div>
)

const SidebarGroup: Stateless<SidebarSectionArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={classes} data-sidebar="group" data-slot="sidebar-group">
		{children}
	</div>
)

const SidebarGroupLabel: Stateless<SidebarSectionArgs> = ({ children, class: classes, ...attrs }) => (
	<div
		{...attrs}
		class={classes}
		data-sidebar="group-label"
		data-slot="sidebar-group-label"
	>
		{children}
	</div>
)

const SidebarGroupAction: Stateless<SidebarGroupActionArgs> = ({ children, class: classes, type = 'button', ...attrs }) => (
	<button
		{...attrs}
		class={classes}
		data-sidebar="group-action"
		data-slot="sidebar-group-action"
		type={type}
	>
		{children}
	</button>
)

const SidebarGroupContent: Stateless<SidebarSectionArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={classes} data-sidebar="group-content" data-slot="sidebar-group-content">
		{children}
	</div>
)

const SidebarMenu: Stateless<SidebarMenuArgs> = ({ children, class: classes, ...attrs }) => (
	<ul {...attrs} class={classes} data-sidebar="menu" data-slot="sidebar-menu">
		{children}
	</ul>
)

const SidebarMenuItem: Stateless<SidebarMenuItemArgs> = ({ children, class: classes, ...attrs }) => (
	<li {...attrs} class={classes} data-sidebar="menu-item" data-slot="sidebar-menu-item">
		{children}
	</li>
)

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
				data-sidebar="menu-button"
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
			data-sidebar="menu-button"
			data-size={size}
			data-slot="sidebar-menu-button"
			title={title}
			type={type}
		>
			{children}
		</button>
	)
}

const SidebarMenuAction: Stateless<SidebarMenuActionArgs> = ({ children, class: classes, type = 'button', ...attrs }) => (
	<button
		{...attrs}
		class={classes}
		data-sidebar="menu-action"
		data-slot="sidebar-menu-action"
		type={type}
	>
		{children}
	</button>
)

const SidebarMenuBadge: Stateless<SidebarMenuBadgeArgs> = ({ children, class: classes, ...attrs }) => (
	<div
		{...attrs}
		class={classes}
		data-sidebar="menu-badge"
		data-slot="sidebar-menu-badge"
	>
		{children}
	</div>
)

const SidebarMenuSkeleton: Stateless<SidebarMenuSkeletonArgs> = ({
	class: classes,
	iconClass,
	showIcon,
	textClass,
	width = '70%',
	...attrs
}) => (
	<div {...attrs} class={classes} data-sidebar="menu-skeleton" data-slot="sidebar-menu-skeleton">
		{showIcon ? <div class={iconClass} data-sidebar="menu-skeleton-icon" /> : null}
		<div class={textClass} data-sidebar="menu-skeleton-text" style={`max-width:${width}`} />
	</div>
)

const SidebarMenuSub: Stateless<SidebarMenuSubArgs> = ({ children, class: classes, ...attrs }) => (
	<ul
		{...attrs}
		class={classes}
		data-sidebar="menu-sub"
		data-slot="sidebar-menu-sub"
	>
		{children}
	</ul>
)

const SidebarMenuSubItem: Stateless<SidebarMenuSubItemArgs> = ({ children, class: classes, ...attrs }) => (
	<li {...attrs} class={classes} data-sidebar="menu-sub-item" data-slot="sidebar-menu-sub-item">
		{children}
	</li>
)

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
		data-sidebar="menu-sub-button"
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
	SidebarInput,
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
	SidebarRail,
	SidebarSeparator,
	SidebarTrigger,
}
