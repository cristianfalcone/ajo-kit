/** Indeterminate fill; the checked fill and the invalid boundary are the box's. */
export const checkboxState = 'has-[:enabled:indeterminate]:bg-ink'

// The box fill lands first, then the glyph (a check, or a minus when
// indeterminate) pops with a springy overshoot. Unchecking collapses
// immediately so the control never feels laggy.
export const checkboxIndicator = 'i-lucide-check playa-choice-glyph size-3.5 scale-50 opacity-0 transition-[opacity,scale] duration-100 ease-in motion-reduce:transition-none peer-checked:scale-100 peer-checked:opacity-100 peer-checked:duration-250 peer-checked:delay-75 peer-checked:ease-[cubic-bezier(0.34,1.56,0.64,1)] peer-indeterminate:i-lucide-minus peer-indeterminate:scale-100 peer-indeterminate:opacity-100 peer-indeterminate:duration-250 peer-indeterminate:delay-75 peer-indeterminate:ease-[cubic-bezier(0.34,1.56,0.64,1)]'

/** Invisible native input over a choice control, 4 px past it on every side, so a 16 px mark is a 24 px target (WCAG 2.5.8). */
export const choiceInput = 'peer absolute -inset-1 m-0 size-[calc(100%+0.5rem)] cursor-pointer opacity-0 disabled:cursor-not-allowed'

// Options in a row keep their own width and sit a field gap apart.
export const choiceGroupOrientation: Record<'horizontal' | 'vertical', string> = {
	vertical: 'grid gap-3',
	horizontal: 'flex flex-wrap items-center gap-x-6 gap-y-3 *:max-w-max',
}
