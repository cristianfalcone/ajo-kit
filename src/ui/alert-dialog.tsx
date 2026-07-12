import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'
import type { FixedArgs, OmitArg } from 'ajo-ui/utils'
import { buttonVariants, type ButtonSize, type ButtonVariant } from './button'
import {
	Dialog as BaseDialog,
	DialogClose as BaseDialogClose,
	DialogFooter as BaseDialogFooter,
	DialogHeader as BaseDialogHeader,
	DialogTitle as BaseDialogTitle,
	DialogTrigger as BaseDialogTrigger,
	type DialogArgs as BaseDialogArgs,
	type DialogCloseArgs as BaseDialogCloseArgs,
	type DialogContentArgs as BaseDialogContentArgs,
	type DialogDescriptionArgs as BaseDialogDescriptionArgs,
	type DialogHeaderArgs as BaseDialogHeaderArgs,
	type DialogTitleArgs as BaseDialogTitleArgs,
	type DialogTriggerArgs as BaseDialogTriggerArgs,
} from 'ajo-ui/dialog'
import { DialogContent, DialogDescription } from './dialog'

export type AlertDialogSize = 'default' | 'sm'

export type AlertDialogArgs = OmitArg<BaseDialogArgs, 'modal'> & FixedArgs<'modal'>

export type AlertDialogTriggerArgs = BaseDialogTriggerArgs

export type AlertDialogContentArgs = OmitArg<
	BaseDialogContentArgs,
	'class' | 'onPointerDownOutside' | 'role'
> & FixedArgs<'onPointerDownOutside' | 'role' | 'showCloseButton' | 'unstyled'> & {
	/** Additional UnoCSS classes for the alert dialog panel. */
	class?: string
	/** Dialog width and layout density. */
	size?: AlertDialogSize
}

export type AlertDialogHeaderArgs = BaseDialogHeaderArgs

export type AlertDialogFooterArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type AlertDialogTitleArgs = BaseDialogTitleArgs

export type AlertDialogDescriptionArgs = BaseDialogDescriptionArgs

export type AlertDialogMediaArgs = WithChildren<IntrinsicElements['div'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type AlertDialogActionArgs = BaseDialogCloseArgs & {
	/** Visual variant for the action button. */
	variant?: ButtonVariant
	/** Size variant for the action button. */
	size?: ButtonSize
}

export type AlertDialogCancelArgs = BaseDialogCloseArgs & {
	/** Visual variant for the cancel button. */
	variant?: ButtonVariant
	/** Size variant for the cancel button. */
	size?: ButtonSize
}

const contentBase = 'data-[size=sm]:max-w-xs sm:data-[size=default]:max-w-lg'
const headerBase = 'grid grid-rows-[auto_1fr] place-items-center text-center has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr] has-data-[slot=alert-dialog-media]:gap-x-6 sm:[[data-slot=alert-dialog-content][data-size=default]_&]:place-items-start sm:[[data-slot=alert-dialog-content][data-size=default]_&]:text-left sm:[[data-slot=alert-dialog-content][data-size=default]_&:has([data-slot=alert-dialog-media])]:grid-rows-[auto_1fr]'
const footerBase = 'flex flex-col-reverse gap-2 [[data-slot=alert-dialog-content][data-size=sm]_&]:grid [[data-slot=alert-dialog-content][data-size=sm]_&]:grid-cols-2 sm:flex-row sm:justify-end'
const titleBase = 'text-lg font-semibold sm:[[data-slot=alert-dialog-content][data-size=default]:has([data-slot=alert-dialog-media])_&]:col-start-2'
const mediaBase = 'mb-2 inline-flex size-16 items-center justify-center rounded-md bg-muted sm:[[data-slot=alert-dialog-content][data-size=default]_&]:row-span-2 [&>svg:not([class*=size-])]:size-8'

/** Root provider for a modal alert dialog that requires a user response. */
const AlertDialog: Stateless<AlertDialogArgs> = attrs => (
	<BaseDialog {...attrs} modal data-slot="alert-dialog" />
)

/** Button that opens the nearest AlertDialog. */
const AlertDialogTrigger: Stateless<AlertDialogTriggerArgs> = attrs => (
	<BaseDialogTrigger {...attrs} data-slot="alert-dialog-trigger" />
)

/** Native modal alert dialog panel. */
const AlertDialogContent: Stateless<AlertDialogContentArgs> = ({
	class: classes,
	size = 'default',
	...attrs
}) => (
	<DialogContent
		{...attrs}
		class={clsx(contentBase, classes)}
		data-size={size}
		data-slot="alert-dialog-content"
		onPointerDownOutside={event => event.preventDefault()}
		role="alertdialog"
		showCloseButton={false}
		unstyled={false}
	/>
)

/** Header area for alert dialog title, description, and optional media. */
const AlertDialogHeader: Stateless<AlertDialogHeaderArgs> = ({ class: classes, ...attrs }) => (
	<BaseDialogHeader {...attrs} class={clsx(headerBase, classes)} data-slot="alert-dialog-header" />
)

/** Footer area for alert dialog cancel and action buttons. */
const AlertDialogFooter: Stateless<AlertDialogFooterArgs> = ({ class: classes, ...attrs }) => (
	<BaseDialogFooter {...attrs} class={clsx(footerBase, classes)} data-slot="alert-dialog-footer" />
)

/** Accessible title for AlertDialogContent. */
const AlertDialogTitle: Stateless<AlertDialogTitleArgs> = ({ class: classes, ...attrs }) => (
	<BaseDialogTitle {...attrs} class={clsx(titleBase, classes)} data-slot="alert-dialog-title" />
)

/** Accessible description for AlertDialogContent. */
const AlertDialogDescription: Stateless<AlertDialogDescriptionArgs> = attrs => (
	<DialogDescription {...attrs} data-slot="alert-dialog-description" />
)

/** Optional media block for an icon or image in the alert dialog header. */
const AlertDialogMedia: Stateless<AlertDialogMediaArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={clsx(mediaBase, classes)} data-slot="alert-dialog-media">
		{children}
	</div>
)

/** Primary alert dialog action button. Closes unless its click handler prevents default. */
const AlertDialogAction: Stateless<AlertDialogActionArgs> = ({
	children,
	class: classes,
	size = 'default',
	variant = 'default',
	...attrs
}) => (
	<BaseDialogClose
		{...attrs}
		class={buttonVariants({ class: classes, size, variant })}
		data-slot="alert-dialog-action"
	>
		{children}
	</BaseDialogClose>
)

/** Cancel button. Closes unless its click handler prevents default. */
const AlertDialogCancel: Stateless<AlertDialogCancelArgs> = ({
	children,
	class: classes,
	size = 'default',
	variant = 'outline',
	...attrs
}) => (
	<BaseDialogClose
		{...attrs}
		class={buttonVariants({ class: classes, size, variant })}
		data-slot="alert-dialog-cancel"
	>
		{children}
	</BaseDialogClose>
)

export {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogMedia,
	AlertDialogTitle,
	AlertDialogTrigger,
}
