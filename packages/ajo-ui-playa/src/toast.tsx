import type { Children, Stateless } from 'ajo'
import { clx } from 'ajo-ui/utils'
import {
	Toaster as BaseToaster,
	type ToasterArgs as BaseToasterArgs,
	type ToastKind,
} from 'ajo-ui/toast'
export { toast } from 'ajo-ui/toast'
export type { ToastKind, ToastOptions, ToastPosition, ToastPromiseMessages } from 'ajo-ui/toast'

/** Props for the themed Toaster. */
export type ToasterArgs = Pick<BaseToasterArgs, 'class' | 'closeButton' | 'duration' | 'expand' | 'hotkey' | 'icons' | 'label' | 'limit' | 'pauseOnWindowBlur' | 'position'> & {
	/** Apply kind-colored toast surfaces to success, info and warning toasts. */
	richColors?: boolean
}

// No z-index and no display utility: the viewport is a `popover="manual"`
// element, so the top layer owns stacking (a fixed z-100 loses to an open
// modal <dialog>) and the UA popover rule must keep it display:none while
// hidden. Corner placement is the base's inline style.
const viewportBase = 'playa-toaster'

const icon = (name: string) => <span aria-hidden="true" class={`${name} size-4 shrink-0`} />

const icons: Partial<Record<ToastKind, Children>> = {
	error: icon('i-lucide-octagon-x text-danger'),
	info: icon('i-lucide-info text-info'),
	loading: icon('i-lucide-loader-2 animate-spin text-muted-foreground motion-reduce:animate-none'),
	success: icon('i-lucide-circle-check text-success'),
	warning: icon('i-lucide-triangle-alert text-warning'),
}

/** Themed renderer for generated toasts. */
export const Toaster: Stateless<ToasterArgs> = ({
	class: classes,
	icons: custom,
	richColors = false,
	...args
}) => (
	<BaseToaster
		{...args}
		class={clx(viewportBase, 'toaster group', classes)}
		closeChildren={<span aria-hidden="true" class="i-lucide-x block size-4" />}
		data-rich-colors={richColors ? 'true' : undefined}
		icons={{ ...icons, ...custom }}
	/>
)
