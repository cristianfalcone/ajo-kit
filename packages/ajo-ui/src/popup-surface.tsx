import type { Stateless } from 'ajo'
import type { PopupView } from './popup'

type PopupSurfaceArgs = {
	/** Whether the surface extends toward its positioning reference. */
	arrow?: boolean
	popup?: Pick<PopupView, 'arrowAttrs'> | null
}

const probeStyle = 'position:absolute;width:14px;height:14px;pointer-events:none;background:transparent;border:0;box-shadow:none;color:transparent;opacity:0'

/** Internal visual surface and optional transparent Floating UI arrow probe. */
const PopupSurface: Stateless<PopupSurfaceArgs> = ({ arrow = false, popup }) => {
	const probe = arrow ? popup?.arrowAttrs() : undefined

	return (
		<>
			<span aria-hidden="true" data-slot="popup-surface" />
			{arrow ? (
				<span
					aria-hidden="true"
					data-slot="popup-arrow"
					ref={probe?.ref}
					style={[probeStyle, probe?.style].filter(Boolean).join(';')}
				/>
			) : null}
		</>
	)
}

export { PopupSurface }
