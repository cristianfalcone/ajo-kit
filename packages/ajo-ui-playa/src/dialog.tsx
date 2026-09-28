import type { Stateless } from 'ajo'
import { clx } from 'ajo-ui/utils'
import {
	Dialog as BaseDialog,
	DialogClose as BaseDialogClose,
	type DialogArgs,
	type DialogCloseArgs,
	DialogContent as BaseDialogContent,
	type DialogContentArgs as BaseDialogContentArgs,
	DialogDescription as BaseDialogDescription,
	type DialogDescriptionArgs,
	DialogFooter as BaseDialogFooter,
	type DialogFooterArgs,
	DialogHeader as BaseDialogHeader,
	type DialogHeaderArgs,
	DialogTitle as BaseDialogTitle,
	type DialogTitleArgs,
} from 'ajo-ui/dialog'
import { modalCentered, modalClosed, modalEnter, modalSurface } from './internal/modal'

export { DialogTrigger } from 'ajo-ui/dialog'
export type {
	DialogArgs,
	DialogCloseArgs,
	DialogDescriptionArgs,
	DialogFooterArgs,
	DialogHeaderArgs,
	DialogSectionArgs,
	DialogTitleArgs,
	DialogTriggerArgs,
} from 'ajo-ui/dialog'

export type DialogContentArgs = BaseDialogContentArgs & {
	/** Skip the default centered dialog surface classes for composed primitives. */
	unstyled?: boolean
}

const contentBase = clx(
	modalSurface,
	modalCentered,
	modalEnter,
	'grid w-full max-w-[calc(100%-2rem)] gap-6 rounded-xl edge p-6 sm:max-w-lg',
)
const closeBase = 'playa-modal-close absolute inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground playa-focus playa-disabled [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4'
// Header, body and footer share the start edge at every width and in either
// direction; the actions keep one order, Cancel and then the primary at the
// end, sharing the row on a phone and wrapping in that order when they must.
const header = 'flex flex-col gap-2 text-start'
const footer = 'flex flex-wrap justify-end gap-2 max-sm:*:flex-1'

/** Root provider for a dialog. */
const Dialog: Stateless<DialogArgs> = ({ class: classes, ...attrs }) => (
	<BaseDialog {...attrs} class={clx('contents', classes)} />
)

/** Native modal dialog surface; compose DialogClose inside it for a close control. */
const DialogContent: Stateless<DialogContentArgs> = ({ class: classes, unstyled, ...attrs }) => (
	<BaseDialogContent {...attrs} class={clx(modalClosed, !unstyled && contentBase, classes)} />
)

/** Button that closes its dialog or drawer; with no children it renders the themed corner X labelled "Close". */
const DialogClose: Stateless<DialogCloseArgs> = ({ children, class: classes, ...attrs }) => children == null ? (
	<BaseDialogClose aria-label="Close" {...attrs} class={clx(closeBase, classes)}>
		<span aria-hidden="true" class="i-lucide-x block size-4" />
	</BaseDialogClose>
) : (
	<BaseDialogClose {...attrs} class={classes}>{children}</BaseDialogClose>
)

/** Header area for dialog title and description. */
const DialogHeader: Stateless<DialogHeaderArgs> = ({ class: classes, ...attrs }) => (
	<BaseDialogHeader {...attrs} class={clx(header, classes)} />
)

/** Footer area for dialog actions. */
const DialogFooter: Stateless<DialogFooterArgs> = ({ class: classes, ...attrs }) => (
	<BaseDialogFooter {...attrs} class={clx(footer, classes)} />
)

/** Accessible title for DialogContent. */
const DialogTitle: Stateless<DialogTitleArgs> = ({ class: classes, ...attrs }) => (
	<BaseDialogTitle {...attrs} class={clx('text-base font-medium', classes)} />
)

/** Accessible description for DialogContent. */
const DialogDescription: Stateless<DialogDescriptionArgs> = ({ class: classes, ...attrs }) => (
	<BaseDialogDescription {...attrs} class={clx('text-sm text-muted-foreground text-pretty', classes)} />
)

export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
}
