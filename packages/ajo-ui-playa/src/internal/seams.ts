// Kept out of ./recipes: every family that imports recipes extracts all of its
// classes, and only ButtonGroup and ToggleGroup join their children.

// Segments touch instead of overlapping: the non-first ring drops its leading
// edge (three inset shadows), so every seam is painted by exactly one hairline
// in that member's own ring color; two overlapped translucent rings would
// composite darker than the outer edges. Ringless members (solid buttons,
// separators) are untouched: the variable only manifests where a ring already
// sets box-shadow.
/** Joins a container's direct children into one segmented control along its axis. */
export const segmentSeams: Record<'horizontal' | 'vertical', string> = {
	horizontal: '[&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none [&>*:not(:first-child)]:[--un-inset-ring-shadow:inset_0_1px_0_var(--un-inset-ring-color,currentColor),inset_0_-1px_0_var(--un-inset-ring-color,currentColor),inset_-1px_0_0_var(--un-inset-ring-color,currentColor)]',
	vertical: '[&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none [&>*:not(:first-child)]:[--un-inset-ring-shadow:inset_1px_0_0_var(--un-inset-ring-color,currentColor),inset_-1px_0_0_var(--un-inset-ring-color,currentColor),inset_0_-1px_0_var(--un-inset-ring-color,currentColor)]',
}
