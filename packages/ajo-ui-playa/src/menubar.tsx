import type { Stateless } from 'ajo'
import { clx } from 'ajo-ui/utils'
import { MenuContent, type MenuContentArgs } from 'ajo-ui/menu'
import {
	Menubar as BaseMenubar,
	MenubarMenu as BaseMenubarMenu,
	MenubarTrigger as BaseMenubarTrigger,
} from 'ajo-ui/menubar'
import type { MenubarArgs, MenubarMenuArgs, MenubarTriggerArgs } from 'ajo-ui/menubar'
export type { MenubarArgs, MenubarMenuArgs, MenubarTriggerArgs, PopupPlacement, PopupPosition } from 'ajo-ui/menubar'

const base = 'flex h-control items-center gap-1 rounded-md glass-chrome edge p-1'
const triggerBase = 'flex items-center rounded-sm px-2 py-1 text-sm font-medium select-none hover:bg-accent hover:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground playa-focus playa-disabled'

/** Persistent horizontal menu bar; compose the Playa Menu parts inside its menus. */
const Menubar: Stateless<MenubarArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenubar {...attrs} class={clx(base, classes)} />
)

/** Top-level Menubar menu. */
const MenubarMenu: Stateless<MenubarMenuArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenubarMenu {...attrs} class={clx('contents', classes)} />
)

/** Top-level trigger inside a Menubar. */
const MenubarTrigger: Stateless<MenubarTriggerArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenubarTrigger {...attrs} class={clx(triggerBase, classes)} />
)

/** Menu surface for a top-level Menubar menu, wider than a plain MenuContent. */
const MenubarContent: Stateless<MenuContentArgs> = ({ class: classes, ...attrs }) => (
	<MenuContent {...attrs} class={clx('playa-menu-content scrollbar-soft min-w-48', classes)} data-slot="menubar-content" />
)

export { Menubar, MenubarContent, MenubarMenu, MenubarTrigger }
