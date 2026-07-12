/** Shared top-layer surface without family-specific geometry. */
export const modalSurface = 'fixed z-50 glass-overlay shadow-lg outline-none backdrop:bg-black/40 backdrop:backdrop-blur-xs'

/** Native-dialog centering without transform composition. */
export const modalCentered = 'inset-0 m-auto'

/** Shared dialog-family enter animation. */
export const modalEnter = 'duration-200 data-[state=open]:animate-dialog-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95'

/** Closed native dialogs stay out of layout before and after discrete transitions. */
export const modalClosed = '[&:not([open])]:hidden'

/** Shared icon close-button recipe for modal surfaces. */
export const modalClose = 'absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-xs opacity-70 outline-none transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4'
