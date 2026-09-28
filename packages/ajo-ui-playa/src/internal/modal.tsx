/** Shared modal layer without family-specific geometry: the solid raised surface over the blurred scrim. */
export const modalSurface = 'fixed z-50 bg-popover text-popover-foreground shadow-xl outline-none scrim'

/** Native-dialog centering without transform composition. */
export const modalCentered = 'inset-0 m-auto'

/** Shared dialog-family enter: a fade that rises 8 px, only the fade under reduced motion. */
export const modalEnter = 'playa-modal-enter'

/** Closed native dialogs stay out of layout before and after discrete transitions. */
export const modalClosed = '[&:not([open])]:hidden'
