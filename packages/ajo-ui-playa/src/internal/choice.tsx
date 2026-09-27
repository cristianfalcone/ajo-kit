/** Checked and indeterminate fill; an invalid input fills with the danger color. */
export const checkboxState = 'has-[:checked]:inset-ring-transparent has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:indeterminate]:inset-ring-transparent has-[:indeterminate]:bg-primary has-[:indeterminate]:text-primary-foreground has-[[aria-invalid=true]:checked]:bg-danger has-[[aria-invalid=true]:checked]:text-danger-foreground has-[[aria-invalid=true]:indeterminate]:bg-danger has-[[aria-invalid=true]:indeterminate]:text-danger-foreground'

// The box fill lands first, then the glyph (a check, or a minus when
// indeterminate) pops with a springy overshoot. Unchecking collapses
// immediately so the control never feels laggy.
export const checkboxIndicator = 'i-lucide-check pointer-events-none size-3.5 text-current scale-50 opacity-0 transition-[opacity,scale] duration-100 ease-in motion-reduce:transition-none peer-checked:scale-100 peer-checked:opacity-100 peer-checked:duration-250 peer-checked:delay-75 peer-checked:ease-[cubic-bezier(0.34,1.56,0.64,1)] peer-indeterminate:i-lucide-minus peer-indeterminate:scale-100 peer-indeterminate:opacity-100 peer-indeterminate:duration-250 peer-indeterminate:delay-75 peer-indeterminate:ease-[cubic-bezier(0.34,1.56,0.64,1)]'

/** Invisible native input overlay shared by checkbox-like controls. */
export const choiceInput = 'peer absolute inset-0 m-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed'

export const choiceGroupOrientation: Record<'horizontal' | 'vertical', string> = {
	vertical: 'grid gap-3',
	horizontal: 'flex flex-wrap items-center gap-3',
}
