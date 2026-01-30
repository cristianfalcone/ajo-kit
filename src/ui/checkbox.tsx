import type { Stateful } from 'ajo'

interface CheckboxProps {
	name: string
	value?: string
	label: string
	disabled?: boolean
	checked?: boolean
}

const Checkbox: Stateful<CheckboxProps, 'label'> = function* (args) {

	let checked = args.checked ?? false

	const toggle = () => this.next(() => { checked = !checked })

	while (true) {
		yield (
			<>
				<input
					type="checkbox"
					name={args.name}
					value={args.value ?? 'true'}
					checked={checked}
					disabled={args.disabled}
					class="sr-only peer"
					set:onchange={toggle}
				/>
				<span class={`flex items-center justify-center w-4.5 h-4.5 rounded ring-1 transition-colors ${checked ? 'bg-primary ring-primary dark:bg-accent dark:ring-accent' : 'bg-white ring-slate-300 dark:bg-white/5 dark:ring-white/15 group-hover:ring-accent/50'}`}>
					{checked && <div class="i-lucide-check w-3.5 h-3.5 text-white dark:text-primary" />}
				</span>
				<span class="text-sm text-slate-700 dark:text-slate-300">{args.label}</span>
			</>
		)
	}
}

Checkbox.is = 'label'
Checkbox.attrs = { class: 'inline-flex items-center gap-2 cursor-pointer select-none group' }

export default Checkbox
