import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import { clx, type FixedArgs, type OmitArg } from 'ajo-ui/utils'
import { buttonVariants, type ButtonSize, type ButtonVariant } from './button'
import {
	Dialog as BaseDialog,
	DialogClose as BaseDialogClose,
	DialogTrigger as BaseDialogTrigger,
	type DialogArgs as BaseDialogArgs,
	type DialogCloseArgs as BaseDialogCloseArgs,
	type DialogContentArgs as BaseDialogContentArgs,
	type DialogDescriptionArgs as BaseDialogDescriptionArgs,
	type DialogHeaderArgs as BaseDialogHeaderArgs,
	type DialogTitleArgs as BaseDialogTitleArgs,
	type DialogTriggerArgs as BaseDialogTriggerArgs,
} from 'ajo-ui/dialog'
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './dialog'

export type AlertDialogSize = 'default' | 'sm'

export type AlertDialogArgs = OmitArg<BaseDialogArgs, 'modal'> & FixedArgs<'modal'>

export type AlertDialogTriggerArgs = BaseDialogTriggerArgs

export type AlertDialogContentArgs = OmitArg<
	BaseDialogContentArgs,
	'class' | 'onPointerDownOutside' | 'role'
> & FixedArgs<'onPointerDownOutside' | 'role' | 'unstyled'> & {
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

// Dialog's header and footer, so every modal keeps one alignment and one
// button order; the small size shares its row between the two actions.
const contentBase = 'data-[size=sm]:w-80'
const footerBase = '[[data-slot=alert-dialog-content][data-size=sm]_&]:*:flex-1'
const mediaBase = 'mb-2 inline-flex size-10 items-center justify-center self-start rounded-full bg-muted [&>svg:not([class*=size-])]:size-5'

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
		class={clx(contentBase, classes)}
		data-size={size}
		data-slot="alert-dialog-content"
		onPointerDownOutside={event => event.preventDefault()}
		role="alertdialog"
		unstyled={false}
	/>
)

/** Header area for alert dialog title, description, and optional media. */
const AlertDialogHeader: Stateless<AlertDialogHeaderArgs> = attrs => (
	<DialogHeader {...attrs} data-slot="alert-dialog-header" />
)

/** Footer area for alert dialog cancel and action buttons. */
const AlertDialogFooter: Stateless<AlertDialogFooterArgs> = ({ class: classes, ...attrs }) => (
	<DialogFooter {...attrs} class={clx(footerBase, classes)} data-slot="alert-dialog-footer" />
)

/** Accessible title for AlertDialogContent. */
const AlertDialogTitle: Stateless<AlertDialogTitleArgs> = attrs => (
	<DialogTitle {...attrs} data-slot="alert-dialog-title" />
)

/** Accessible description for AlertDialogContent. */
const AlertDialogDescription: Stateless<AlertDialogDescriptionArgs> = attrs => (
	<DialogDescription {...attrs} data-slot="alert-dialog-description" />
)

/** Optional media block for an icon or image in the alert dialog header. */
const AlertDialogMedia: Stateless<AlertDialogMediaArgs> = ({ children, class: classes, ...attrs }) => (
	<div {...attrs} class={clx(mediaBase, classes)} data-slot="alert-dialog-media">
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

/** Cancel button, the secondary action every Playa dialog and form pairs with its primary. Closes unless its click handler prevents default. */
const AlertDialogCancel: Stateless<AlertDialogCancelArgs> = ({
	children,
	class: classes,
	size = 'default',
	variant = 'secondary',
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
