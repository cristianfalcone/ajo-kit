import type { Stateless } from 'ajo'
import clsx from 'clsx'
import {
	NavigationMenu as BaseNavigationMenu,
	NavigationMenuContent as BaseNavigationMenuContent,
	NavigationMenuItem as BaseNavigationMenuItem,
	NavigationMenuLink as BaseNavigationMenuLink,
	NavigationMenuList as BaseNavigationMenuList,
	NavigationMenuTrigger as BaseNavigationMenuTrigger,
	type NavigationMenuArgs,
	type NavigationMenuContentArgs,
	type NavigationMenuItemArgs,
	type NavigationMenuLinkArgs,
	type NavigationMenuListArgs,
	type NavigationMenuTriggerArgs,
	type NavigationMenuValue,
} from 'ajo-ui/navigation-menu'

export type {
	NavigationMenuArgs,
	NavigationMenuContentArgs,
	NavigationMenuItemArgs,
	NavigationMenuLinkArgs,
	NavigationMenuListArgs,
	NavigationMenuTriggerArgs,
	NavigationMenuValue,
}

const rootBase = 'group/navigation-menu relative flex max-w-max flex-1 items-center justify-center'
const listBase = 'group flex flex-1 list-none items-center justify-center gap-1'
const triggerBase = 'group inline-flex h-9 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium transition-[color,box-shadow] outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground'
// The popup surface lives on the content panel (same look as the menu
// surfaces); positioning constrain writes maxHeight, overflow makes it scroll.
const contentBase = 'z-50 m-0 min-w-[12rem] overflow-x-hidden overflow-y-auto scrollbar-soft rounded-md glass-overlay edge p-2 shadow-lg outline-none data-[state=open]:animate-fade-in'
const linkBase = 'flex flex-col gap-1 rounded-sm p-2 text-sm transition-all outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground [&_svg:not([class*=size-])]:size-4 [&_svg:not([class*=text-])]:text-muted-foreground'

/** Returns the UnoCSS class list for a navigation menu trigger. */
export const navigationMenuTriggerVariants = ({ class: classes }: { class?: string } = {}) =>
	clsx(triggerBase, classes)

/** Root landmark for a navigation menu. */
const NavigationMenu: Stateless<NavigationMenuArgs> = ({ class: classes, ...attrs }) => (
	<BaseNavigationMenu {...attrs} class={clsx(rootBase, classes)} />
)

/** Horizontal list of navigation menu items. */
const NavigationMenuList: Stateless<NavigationMenuListArgs> = ({ class: classes, ...attrs }) => (
	<BaseNavigationMenuList {...attrs} class={clsx(listBase, classes)} />
)

/** Top-level item inside a NavigationMenuList. */
const NavigationMenuItem: Stateless<NavigationMenuItemArgs> = ({ class: classes, ...attrs }) => (
	<BaseNavigationMenuItem {...attrs} class={clsx('relative', classes)} />
)

/** Button that opens an item content panel. */
const NavigationMenuTrigger: Stateless<NavigationMenuTriggerArgs> = ({
	children,
	class: classes,
	...attrs
}) => (
	<BaseNavigationMenuTrigger
		{...attrs}
		class={navigationMenuTriggerVariants({ class: clsx('group', classes) })}
	>
		{children}
		<span aria-hidden="true" class="i-lucide-chevron-down relative top-px ml-1 size-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
	</BaseNavigationMenuTrigger>
)

/** Popover panel for a NavigationMenuItem. */
const NavigationMenuContent: Stateless<NavigationMenuContentArgs> = ({ class: classes, ...attrs }) => (
	<BaseNavigationMenuContent {...attrs} class={clsx(contentBase, classes)} />
)

/** Link styled for use inside or directly within a navigation menu item. */
const NavigationMenuLink: Stateless<NavigationMenuLinkArgs> = ({ class: classes, ...attrs }) => (
	<BaseNavigationMenuLink {...attrs} class={clsx(linkBase, classes)} />
)

export {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
}
