/** Shared top-layer surface without family-specific geometry. */
// Frost over dim: the backdrop blurs the page while barely darkening it, so
// its elements stay visible as soft shapes and the glass-overlay surface reads
// as translucent frost instead of a solid sheet.
export const modalSurface = 'fixed z-50 glass-overlay shadow-lg outline-none backdrop:bg-black/20 backdrop:backdrop-blur-sm'

/** Native-dialog centering without transform composition. */
export const modalCentered = 'inset-0 m-auto'

/** Shared dialog-family enter animation, slower than the popup default. */
export const modalEnter = 'duration-200 [--un-animate-duration:200ms] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95'

/** Closed native dialogs stay out of layout before and after discrete transitions. */
export const modalClosed = '[&:not([open])]:hidden'
