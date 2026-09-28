/**
 * Open and close for Popover, Tooltip and NavigationMenu: a fade with a scale
 * from 0.98 on the shared keyframes, none under reduced motion.
 */
export const popupMotion = 'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-98 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-98 [animation-timing-function:var(--ease)] motion-reduce:animate-none'
