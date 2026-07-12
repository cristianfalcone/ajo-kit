import type { Stateless } from 'ajo'
import clsx from 'clsx'
import {
	Dialog as BaseDialog,
	DialogClose as BaseDialogClose,
	type DialogArgs,
	DialogContent as BaseDialogContent,
	type DialogContentArgs as BaseDialogContentArgs,
	DialogDescription as BaseDialogDescription,
	type DialogDescriptionArgs,
	DialogFooter as BaseDialogFooter,
	type DialogFooterArgs as BaseDialogFooterArgs,
	DialogHeader as BaseDialogHeader,
	type DialogHeaderArgs,
	DialogTitle as BaseDialogTitle,
	type DialogTitleArgs,
} from 'ajo-ui/dialog'
import { buttonVariants } from './button'
import { modalCentered, modalClose, modalClosed, modalEnter, modalSurface } from './modal'

export { DialogClose, DialogTrigger } from 'ajo-ui/dialog'
export type {
	DialogArgs,
	DialogCloseArgs,
	DialogDescriptionArgs,
	DialogHeaderArgs,
	DialogSectionArgs,
	DialogTitleArgs,
	DialogTriggerArgs,
} from 'ajo-ui/dialog'

export type DialogContentArgs = BaseDialogContentArgs & {
	/** Skip the default centered dialog panel classes for composed primitives. */
	unstyled?: boolean
	/** Show the default top-right close button. */
	showCloseButton?: boolean
}

export type DialogFooterArgs = BaseDialogFooterArgs & {
	/** Add an outline close button after custom footer actions. */
	showCloseButton?: boolean
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

/** Native modal dialog panel. */
const DialogContent: Stateless<DialogContentArgs> = ({
	children,
	class: classes,
	showCloseButton = true,
	unstyled,
	...attrs
}) => (
	<BaseDialogContent
		{...attrs}
		class={clsx(modalClosed, !unstyled && contentBase, classes)}
	>
		{children}
		{showCloseButton ? (
			<BaseDialogClose class={modalClose} aria-label="Close">
				<span aria-hidden="true" class="i-lucide-x block size-4" />
				<span class="sr-only">Close</span>
			</BaseDialogClose>
		) : null}
	</BaseDialogContent>
)

/** Header area for dialog title and description. */
const DialogHeader: Stateless<DialogHeaderArgs> = ({ class: classes, ...attrs }) => (
	<BaseDialogHeader {...attrs} class={clsx('flex flex-col gap-2 text-center sm:text-left', classes)} />
)

/** Footer area for dialog actions. */
const DialogFooter: Stateless<DialogFooterArgs> = ({
	children,
	class: classes,
	showCloseButton,
	...attrs
}) => (
	<BaseDialogFooter {...attrs} class={clsx('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', classes)}>
		{children}
		{showCloseButton ? (
			<BaseDialogClose class={buttonVariants({ variant: 'outline' })}>Close</BaseDialogClose>
		) : null}
	</BaseDialogFooter>
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
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
}
