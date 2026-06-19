type PageInfo = {
	page: number
	size: number
	hasPrev: boolean
	hasNext: boolean
	prev?: string
	next?: string
}

type Props = {
	page: PageInfo
	count: number
	label: string
}

const base = 'inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors'
const active = 'text-slate-700 hover:bg-slate-900/5 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white'
const disabled = 'pointer-events-none text-slate-300 dark:text-slate-600'

const Control = ({ href, icon, text, iconEnd }: { href?: string; icon: string; text: string; iconEnd?: boolean }) => {
	const content = (
		<>
			{!iconEnd && <span class={`${icon} h-4 w-4`} />}
			{text}
			{iconEnd && <span class={`${icon} h-4 w-4`} />}
		</>
	)

	return href
		? <a href={href} class={`${base} ${active}`}>{content}</a>
		: <span class={`${base} ${disabled}`}>{content}</span>
}

export default function Pager({ page, count, label }: Props) {
	if (!page.hasPrev && !page.hasNext) return null

	return (
		<div class="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm dark:border-slate-700">
			<span class="text-slate-500 dark:text-slate-400">
				Page {page.page} - {count} {label}
			</span>
			<div class="flex items-center gap-1">
				<Control href={page.prev} icon="i-lucide-chevron-left" text="Prev" />
				<Control href={page.next} icon="i-lucide-chevron-right" text="Next" iconEnd />
			</div>
		</div>
	)
}
