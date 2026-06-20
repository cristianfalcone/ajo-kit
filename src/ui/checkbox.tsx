import type { Children, Stateful } from 'ajo'
import clsx from 'clsx'

type CheckboxProps = {
	name: string
	value?: string
	label: Children
	note?: Children
	disabled?: boolean
	checked?: boolean
	onToggle?: () => void
	labelClass?: string
	noteClass?: string
}

const Checkbox: Stateful<CheckboxProps, 'label'> = function* (args) {

	let checked = args.checked ?? false
	let props = args

	const toggle = () => {
		if (props.disabled) return

		if (props.checked === undefined) {
			this.next(() => checked = !checked)
		}

		props.onToggle?.()
	}

	for (props of this) {
		const active = props.checked ?? checked

		yield (
			<>
				<input
					type="checkbox"
					name={props.name}
					value={props.value ?? 'true'}
					checked={active}
					disabled={props.disabled}
					class="sr-only peer"
					set:checked={active}
					set:onchange={toggle}
				/>
				<span class={clsx(
					'flex items-center justify-center w-4.5 h-4.5 rounded shadow-xs inset-ring transition-colors dark:shadow-none',
					active
						? 'bg-accent/100 shadow-accent/15 inset-ring-accent'
						: 'bg-[#fbfdfb]/92 shadow-slate-900/10 inset-ring-slate-900/18 dark:bg-white/5 dark:inset-ring-white/15 group-hover:inset-ring-accent/50',
				)}>
					{active && <span class="i-lucide-check w-3.5 h-3.5 text-white" />}
				</span>
				<span class={clsx('text-sm text-slate-700 dark:text-slate-300', props.labelClass)}>{props.label}</span>
				{props.note && <span class={clsx('text-xs text-slate-500 dark:text-slate-400', props.noteClass)}>{props.note}</span>}
			</>
		)
	}
}

Checkbox.is = 'label'
Checkbox.attrs = { class: 'inline-flex items-center gap-2 cursor-pointer select-none group' }

export default Checkbox
