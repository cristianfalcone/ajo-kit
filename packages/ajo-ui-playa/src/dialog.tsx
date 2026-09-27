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
	'grid w-full max-w-[calc(100%-2rem)] gap-4 rounded-xl edge p-6 sm:max-w-lg',
)
const closeBase = 'absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-full opacity-70 outline-none transition-[background-color,opacity] hover:bg-accent hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4'

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
	<BaseDialogHeader {...attrs} class={clx('flex flex-col gap-2 text-center sm:text-left', classes)} />
)

/** Footer area for dialog actions. */
const DialogFooter: Stateless<DialogFooterArgs> = ({ class: classes, ...attrs }) => (
	<BaseDialogFooter {...attrs} class={clx('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', classes)} />
)

/** Accessible title for DialogContent. */
const DialogTitle: Stateless<DialogTitleArgs> = ({ class: classes, ...attrs }) => (
	<BaseDialogTitle {...attrs} class={clx('text-lg font-semibold leading-none', classes)} />
)

/** Accessible description for DialogContent. */
const DialogDescription: Stateless<DialogDescriptionArgs> = ({ class: classes, ...attrs }) => (
	<BaseDialogDescription {...attrs} class={clx('text-sm text-muted-foreground', classes)} />
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
