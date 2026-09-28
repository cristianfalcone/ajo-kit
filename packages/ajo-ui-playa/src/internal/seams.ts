// @unocss-include: a plain .ts module, which UnoCSS does not scan unless told.
// Kept out of ./recipes: every family that imports recipes extracts all of its
// classes, and only ButtonGroup and ToggleGroup join their children.

// Segments touch instead of overlapping: each member after the first drops
// its leading hairline (three inset shadows, not four), so every seam is
// painted by exactly one hairline in that member's own colour; two overlapped
// translucent hairlines would composite darker than the outer sides. The
// leading side is the start: the left in LTR, the right in RTL. Members
// without a hairline (filled buttons, separators) are untouched: the variable
// only shows where their hairline already sets box-shadow.
/** Joins an element's direct children into one segmented control along its axis. */
export const segmentSeams: Record<'horizontal' | 'vertical', string> = {
	horizontal: '[&>*:not(:first-child)]:rounded-s-none [&>*:not(:last-child)]:rounded-e-none [&>*:not(:first-child)]:[--un-inset-ring-shadow:inset_0_1px_0_var(--un-inset-ring-color,currentColor),inset_0_-1px_0_var(--un-inset-ring-color,currentColor),inset_-1px_0_0_var(--un-inset-ring-color,currentColor)] rtl:[&>*:not(:first-child)]:[--un-inset-ring-shadow:inset_0_1px_0_var(--un-inset-ring-color,currentColor),inset_0_-1px_0_var(--un-inset-ring-color,currentColor),inset_1px_0_0_var(--un-inset-ring-color,currentColor)]',
	vertical: '[&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none [&>*:not(:first-child)]:[--un-inset-ring-shadow:inset_1px_0_0_var(--un-inset-ring-color,currentColor),inset_-1px_0_0_var(--un-inset-ring-color,currentColor),inset_0_-1px_0_var(--un-inset-ring-color,currentColor)]',
}
