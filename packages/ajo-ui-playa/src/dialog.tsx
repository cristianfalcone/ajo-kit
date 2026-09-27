import type { Stateless } from 'ajo'
import clsx from 'clsx'
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
import { modalCentered, modalClose, modalClosed, modalEnter, modalSurface } from './modal'

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
	/** Skip the default centered dialog panel classes for composed primitives. */
	unstyled?: boolean
}

const contentBase = clsx(
	modalSurface,
	modalCentered,
	modalEnter,
	'grid w-full max-w-[calc(100%-2rem)] gap-4 rounded-xl edge p-6 sm:max-w-lg',
)

/** Root provider for a dialog. */
const Dialog: Stateless<DialogArgs> = ({ class: classes, ...attrs }) => (
	<BaseDialog {...attrs} class={clsx('contents', classes)} />
)

/** Native modal dialog panel; compose DialogClose inside it for a close control. */
const DialogContent: Stateless<DialogContentArgs> = ({ class: classes, unstyled, ...attrs }) => (
	<BaseDialogContent {...attrs} class={clsx(modalClosed, !unstyled && contentBase, classes)} />
)

/** Button that closes its dialog or drawer; with no children it renders the themed corner X labelled "Close". */
const DialogClose: Stateless<DialogCloseArgs> = ({ children, class: classes, ...attrs }) => children == null ? (
	<BaseDialogClose aria-label="Close" {...attrs} class={clsx(modalClose, classes)}>
		<span aria-hidden="true" class="i-lucide-x block size-4" />
	</BaseDialogClose>
) : (
	<BaseDialogClose {...attrs} class={classes}>{children}</BaseDialogClose>
)

/** Header area for dialog title and description. */
const DialogHeader: Stateless<DialogHeaderArgs> = ({ class: classes, ...attrs }) => (
	<BaseDialogHeader {...attrs} class={clsx('flex flex-col gap-2 text-center sm:text-left', classes)} />
)

/** Footer area for dialog actions. */
const DialogFooter: Stateless<DialogFooterArgs> = ({ class: classes, ...attrs }) => (
	<BaseDialogFooter {...attrs} class={clsx('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', classes)} />
)

/** Accessible title for DialogContent. */
const DialogTitle: Stateless<DialogTitleArgs> = ({ class: classes, ...attrs }) => (
	<BaseDialogTitle {...attrs} class={clsx('text-lg font-semibold leading-none', classes)} />
)

/** Accessible description for DialogContent. */
const DialogDescription: Stateless<DialogDescriptionArgs> = ({ class: classes, ...attrs }) => (
	<BaseDialogDescription {...attrs} class={clsx('text-sm text-muted-foreground', classes)} />
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
