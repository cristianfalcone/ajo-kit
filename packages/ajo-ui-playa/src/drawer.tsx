import type { Stateless } from 'ajo'
import { clx } from 'ajo-ui/utils'
import type { DialogDescriptionArgs, DialogFooterArgs, DialogHeaderArgs, DialogTitleArgs } from 'ajo-ui/dialog'
import {
	Drawer as BaseDrawer,
	DrawerContent as BaseDrawerContent,
	type DrawerArgs,
	type DrawerContentArgs,
} from 'ajo-ui/drawer'
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './dialog'
import { modalClosed, modalSurface } from './internal/modal'
export type { DrawerArgs, DrawerContentArgs, DrawerSide } from 'ajo-ui/drawer'

const base = clx(modalSurface, 'playa-drawer')
// Edge geometry keys off the base's `data-side`, which names a physical edge,
// so a right drawer stays on the right in either direction. Top and bottom
// drawers with a handle become rounded sheets capped below the viewport height.
const horizontal = [
	'data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:left-auto data-[side=right]:h-full data-[side=right]:max-h-none data-[side=right]:w-3/4 data-[side=right]:max-w-none data-[side=right]:border-l data-[side=right]:sm:max-w-sm',
	'data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:right-auto data-[side=left]:h-full data-[side=left]:max-h-none data-[side=left]:w-3/4 data-[side=left]:max-w-none data-[side=left]:border-r data-[side=left]:sm:max-w-sm',
].join(' ')
const vertical = [
	'data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:bottom-auto data-[side=top]:h-auto data-[side=top]:w-full data-[side=top]:max-w-none data-[side=top]:border-b',
	'data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:top-auto data-[side=bottom]:h-auto data-[side=bottom]:w-full data-[side=bottom]:max-w-none data-[side=bottom]:border-t',
].join(' ')
const sheet = 'data-[side=top]:max-h-[80vh] data-[side=top]:rounded-b-xl data-[side=bottom]:max-h-[80vh] data-[side=bottom]:rounded-t-xl'
const handleBase = '*:data-[slot=drawer-handle]:mx-auto *:data-[slot=drawer-handle]:mt-4 *:data-[slot=drawer-handle]:h-2 *:data-[slot=drawer-handle]:w-24 *:data-[slot=drawer-handle]:shrink-0 *:data-[slot=drawer-handle]:touch-none *:data-[slot=drawer-handle]:cursor-grab *:data-[slot=drawer-handle]:rounded-full *:data-[slot=drawer-handle]:bg-input *:data-[slot=drawer-handle]:active:cursor-grabbing'

/** Root provider for a modal drawer; compose DialogTrigger and DialogClose from the Playa dialog. */
const Drawer: Stateless<DrawerArgs> = ({
	class: classes,
	...attrs
}) => (
	<BaseDrawer {...attrs} class={clx('contents', classes)} />
)

/** Native modal drawer surface with an optional drag handle; compose DialogClose inside it for a close control. */
const DrawerContent: Stateless<DrawerContentArgs> = ({ class: classes, handle, ...attrs }) => (
	<BaseDrawerContent
		{...attrs}
		class={clx(modalClosed, base, horizontal, vertical, handle && clx(sheet, handleBase), classes)}
		handle={handle}
	/>
)

/** Header area for drawer title and description, on the drawer's padding. */
const DrawerHeader: Stateless<DialogHeaderArgs> = ({ class: classes, ...attrs }) => (
	<DialogHeader {...attrs} class={clx('p-4', classes)} data-slot="drawer-header" />
)

/** Footer area for drawer actions in the dialog's order, pinned to the drawer end. */
const DrawerFooter: Stateless<DialogFooterArgs> = ({ class: classes, ...attrs }) => (
	<DialogFooter {...attrs} class={clx('mt-auto p-4', classes)} data-slot="drawer-footer" />
)

/** Accessible title for DrawerContent. */
const DrawerTitle: Stateless<DialogTitleArgs> = attrs => (
	<DialogTitle {...attrs} data-slot="drawer-title" />
)

/** Accessible description for DrawerContent. */
const DrawerDescription: Stateless<DialogDescriptionArgs> = attrs => (
	<DialogDescription {...attrs} data-slot="drawer-description" />
)

export {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
}
