import clsx from 'clsx'
import Tree, { type TreeNode } from '/src/ui/tree'

const fileIcon = (name: string) => {
	if (name === 'page.tsx') return 'i-lucide-file-terminal'
	if (name === 'layout.tsx') return 'i-lucide-layout'
	if (name.endsWith('.config.ts')) return 'i-lucide-settings-2'
	if (name === 'server.ts') return 'i-lucide-server'
	return 'i-lucide-file'
}

const File = ({ name, kind, note, route }: { name: string, kind: string, note?: string, route?: string }) => {

	const isDir = kind === 'dir'

	return (
		<div class="flex items-center gap-2 p-1 text-xs">
			<div class="flex items-center gap-2 flex-1">
				{isDir
					? <span class="text-slate-500 dark:text-slate-400 i-lucide-folder" />
					: <span class={`${fileIcon(name)} text-indigo-500/80 dark:text-indigo-300/90`} />
				}
				<div class={clsx(
					'truncate',
					['page.tsx', 'layout.tsx'].includes(name) ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
				)}>
					{name}
				</div>
				{note && (
					<div class="text-slate-500 dark:text-slate-500 font-normal tracking-tight hidden md:inline">
						{note}
					</div>
				)}
			</div>
			{route && (
				<div class="flex items-center gap-2">
					<div class="i-lucide-arrow-right text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400" />
					<code class="px-2 py-1 rounded bg-slate-900/80 dark:bg-white/10 text-slate-100 dark:text-slate-200 font-normal tracking-tight">
						{route}
					</code>
				</div>
			)}
		</div>
	)
}

const files: TreeNode[] = [
	{
		content: <File name='src' kind='dir' />,
		children: [
			{ content: <File name='layout.tsx' kind='file' note='Root layout: theme, nav, contexts' /> },
			{ content: <File name='app.tsx' kind='file' note='Client bootstrap / hydration' /> },
			{ content: <File name='page.tsx' kind='file' note='Landing hero' route='/' /> },
			{ content: <File name='constants.ts' kind='file' note='Context definitions' /> },
			{
				content: <File name='ui' kind='dir' />,
				children: [
					{ content: <File name='button.tsx' kind='file' /> },
					{ content: <File name='spinner.tsx' kind='file' /> },
					{ content: <File name='tree.tsx' kind='file' note='This tree component' /> },
				]
			},
			{
				content: <File name='(marketing)' kind='dir' />,
				children: [
					{ content: <File name='layout.tsx' kind='file' note='Marketing shell' /> },
					{
						content: <File name='blog' kind='dir' />,
						children: [
							{ content: <File name='page.tsx' kind='file' note='Blog index (data fetch)' route='/blog' /> },
							{
								content: <File name='[id]' kind='dir' />,
								children: [
									{ content: <File name='page.tsx' kind='file' note='Blog article detail' route='/blog/:id' /> },
								]
							},
						]
					},
					{
						content: <File name='about' kind='dir' />,
						children: [
							{ content: <File name='page.tsx' kind='file' note='This page' route='/about' /> },
						]
					},
				]
			},
			{
				content: <File name='(shop)' kind='dir' />,
				children: [
					{ content: <File name='layout.tsx' kind='file' note='Shop shell + cart banner' /> },
					{
						content: <File name='products' kind='dir' />,
						children: [
							{ content: <File name='page.tsx' kind='file' note='Product list' route='/products' /> },
							{
								content: <File name='[id]' kind='dir' />,
								children: [
									{ content: <File name='page.tsx' kind='file' note='Product detail' route='/products/:id' /> },
								]
							},
						]
					},
					{
						content: <File name='checkout' kind='dir' />,
						children: [
							{ content: <File name='page.tsx' kind='file' note='Checkout experience' route='/checkout' /> },
						]
					},
				]
			},
		],
	},
	{ content: <File name='server.ts' kind='file' note='Entry: SSR rendering' /> },
	{ content: <File name='vite.config.ts' kind='file' note='Build tooling (ajo JSX inject)' /> },
	{ content: <File name='uno.config.ts' kind='file' note='Utility / theme config' /> },
]

const features = [
	['i-lucide-zap', 'Lean Core', 'Just generators + a tiny reconciler. No virtual component classes, no effect labyrinth.'],
	['i-lucide-cpu', 'SSR Friendly', 'Patterns map directly to server rendering needs without extra ceremony.'],
	['i-lucide-database', 'Data Simplicity', 'Fetch where you render. Mutate plain objects + call this.next().'],
	['i-lucide-layout', 'Nested Layouts', 'Folder hierarchy = UI shell composition (marketing, blog, shop groups).'],
	['i-lucide-box', 'Focused Interactivity', 'Only wire up what needs interaction (cart, theme toggle, product actions).'],
	['i-lucide-sparkles', 'Theme System', 'Class-based light/dark with persisted tri‑mode cycle & accessible toggle.'],
]

const stack = [
	['i-lucide-cog', 'Ajo', 'provides generator-based component model + direct DOM reconciliation.'],
	['i-lucide-bolt', 'Vite', 'handles fast dev bundling + TS transform with JSX factory injection.'],
	['i-lucide-wand-2', 'UnoCSS', <>utility engine with <code class="px-1 rounded bg-slate-900/5 dark:bg-white/10">presetWind3</code> + icons preset for atomic styling.</>],
	['i-lucide-moon-star', 'Theme Context', <>persists tri-mode (system/light/dark) using <code class="px-1 rounded bg-slate-900/5 dark:bg-white/10">localStorage</code>.</>],
	['i-lucide-shopping-cart', 'Cart Context', <>mutates a plain object + triggers <code class="px-1 rounded bg-slate-900/5 dark:bg-white/10">this.next()</code> for reactive updates.</>],
	['i-lucide-newspaper', 'Demo Data', 'fetched from public APIs to simulate real flows.']
]

const flow = [
	<>Request hits <code class="px-1 rounded bg-slate-900/5 dark:bg-white/10">server.ts</code>; route file graph resolved.</>,
	<>Root + nested <code class="px-1 rounded bg-slate-900/5 dark:bg-white/10">layout.tsx</code> generators initialize with initial markup immediately.</>,
	'Page generator yields a skeleton/pass-through state while data fetches.',
	'Data settles → component advances with richer DOM (no diff illusions: just next yield).',
	'Client bootstrap attaches lightweight interactivity (cart actions, theme toggle, navigation).',
	'Subsequent client navigations reuse contexts & progressively enhance next pages.',
]

const performance = [
	['i-lucide-clock', 'Early first paint via incremental HTML chunks.'],
	['i-lucide-shuffle', 'No synthetic suspense boundaries—just imperative yields.'],
	['i-lucide-scan-text', 'Minimal wrapper elements thanks to fragments in generators.'],
	['i-lucide-binary', 'State = plain closure variables; zero serialization cost.'],
	['i-lucide-git-compare', 'In-place node patching avoids full virtual DOM diff passes.']
]

const conventions = [
	['i-lucide-ban', <><strong>Do not destructure props</strong> in generator signature; use <code class="px-1 rounded bg-slate-900/5 dark:bg-white/10">args</code> inside loop for freshness.</>],
	['i-lucide-repeat-2', <>Use <code class="px-1 rounded bg-slate-900/5 dark:bg-white/10">this.next()</code> to batch local mutations.</>],
	['i-lucide-layers', <>Prefer fragments (<code class="px-1 rounded bg-slate-900/5 dark:bg-white/10">&lt;&gt;</code>) to avoid wrapper depth.</>],
	['i-lucide-gauge', <>Add <code class="px-1 rounded bg-slate-900/5 dark:bg-white/10">memo</code> around large static subtrees if profiling shows churn.</>],
	['i-lucide-circle-dot', 'Keep contexts narrowly scoped (Theme, Cart, Query) instead of universal stores.'],
]

export default () => (
	<article class="py-20 space-y-24" memo>
		<header class="text-center space-y-8">
			<h1 class="text-4xl sm:text-5xl font-bold tracking-tight leading-tight text-slate-900 dark:text-white">
				Inside <span class="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500">ajo‑kit</span>
			</h1>
			<p class="text-slate-600 dark:text-gray-300/80 leading-relaxed text-lg">
				A focused <strong class="font-semibold text-slate-800 dark:text-white">base template + example apps</strong> built on
				<span class="inline-flex items-center gap-1 mx-2 px-2 py-0.5 rounded-md bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/25 dark:text-indigo-200 text-sm">Ajo</span>
				and
				<span class="inline-flex items-center gap-1 mx-2 px-2 py-0.5 rounded-md bg-pink-500/10 text-pink-600 dark:bg-pink-500/25 dark:text-pink-200 text-sm">Vite</span>
				<br />
				showcasing generator components, nested layouts, a blog, and a small shop with cart + theming.
			</p>
			<div class="flex flex-wrap justify-center gap-3 text-xs font-medium">
				{['Generator Components', 'File Routes', 'Local Mutations', 'Scoped Context', 'Utility CSS', 'Theme Persistence'].map(t => (
					<span key={t} class="px-3 py-1 rounded-full bg-slate-900/5 ring-1 ring-slate-200 text-indigo-600/80 dark:bg-white/5 dark:ring-white/10 dark:text-indigo-200/80">{t}</span>
				))}
			</div>
		</header>
		<section class="grid gap-8 md:grid-cols-3">
			{features.map(([icon, title, body]) => (
				<div key={title} class="panel p-6 space-y-4 relative overflow-hidden">
					<div class="flex items-center gap-3">
						<span class={`size-10 bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 shadow ${icon}`} />
						<h2 class="text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">{title}</h2>
					</div>
					<p class="text-sm leading-relaxed text-slate-700 dark:text-gray-300/80">{body}</p>
				</div>
			))}
		</section>
		<section class="grid gap-10 lg:grid-cols-2 items-start">
			<div class="panel p-6 space-y-5">
				<h3 class="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
					<span class="i-lucide-folder-tree" /> Project Structure
				</h3>
				<p class="text-sm leading-relaxed text-slate-700 dark:text-gray-300/80">
					Organized by route groups and UI primitives. Each directory holding a <code class="px-1 rounded bg-slate-900/5 dark:bg-white/10 text-indigo-600 dark:text-indigo-200">layout.tsx</code> or <code class="px-1 rounded bg-slate-900/5 dark:bg-white/10 text-indigo-600 dark:text-indigo-200">page.tsx</code> composes into the render tree. Dynamic params follow a familiar <code class="px-1 rounded bg-slate-900/5 dark:bg-white/10 text-indigo-600 dark:text-indigo-200">[id]</code> convention.
				</p>
				<Tree nodes={files} />
			</div>
			<div class="panel p-6 space-y-6">
				<h3 class="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
					<span class="i-lucide-layers" /> Stack & Decisions
				</h3>
				<ul class="space-y-4 text-sm leading-relaxed text-slate-700 dark:text-gray-300/80">
					{stack.map(([icon, title, body]) => (
						<li class="flex items-center gap-3">
							<span class={`${icon} text-indigo-500/80`} />
							<span><strong>{title}</strong> {body}</span>
						</li>
					))}
				</ul>
			</div>
		</section>
		<section class="grid gap-10 lg:grid-cols-2 items-start">
			<div class="panel p-6 space-y-5">
				<h3 class="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300"><span class="i-lucide-route" /> Render Flow</h3>
				<ol class="space-y-3">
					{flow.map((item, i) => (
						<li key={i} class="flex items-center gap-3">
							<span class="flex size-4 items-center justify-center rounded-full bg-indigo-500/15 dark:bg-indigo-500/25 text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-200 ring-1 ring-indigo-500/30 dark:ring-indigo-400/30">{i + 1}</span>
							<p class="text-sm leading-relaxed text-slate-700 dark:text-gray-300/80">{item}</p>
						</li>
					))}
				</ol>
			</div>
			<div class="panel p-6 space-y-5">
				<h3 class="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300"><span class="i-lucide-rocket" /> Why It Stays Fast</h3>
				<ul class="space-y-3 text-sm leading-relaxed text-slate-700 dark:text-gray-300/80">
					{performance.map(([icon, text]) => (
						<li class="flex items-center gap-2" key={icon}>
							<span class={`${icon} text-indigo-500/80`} /> {text}
						</li>
					))}
				</ul>
			</div>
		</section>
		<section class="grid gap-10 lg:grid-cols-2 items-start">
			<div class="panel p-6 space-y-5">
				<h3 class="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300"><span class="i-lucide-compass" /> Conventions</h3>
				<ul class="space-y-3 text-sm leading-relaxed text-slate-700 dark:text-gray-300/80">
					{conventions.map(([icon, body]) => (
						<li key={icon} class="flex items-center gap-3">
							<span class={`${icon} text-indigo-500/80`} />
							<p class="leading-relaxed">{body}</p>
						</li>
					))}
				</ul>
			</div>
			<div class="panel p-6 space-y-6">
				<h3 class="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300"><span class="i-lucide-plug" /> Extend It</h3>
				<div class="space-y-4 text-sm leading-relaxed text-slate-700 dark:text-gray-300/80">
					<p>Add new feature areas by creating a folder group (e.g. <code class="px-1 rounded bg-slate-900/5 dark:bg-white/10">(account)</code>) with its own <code class="px-1 rounded bg-slate-900/5 dark:bg-white/10">layout.tsx</code>. Keep business logic inside generator closures; escalate only cross-cutting state to contexts.</p>
					<p>Swap the demo data layer with a real API: replace fetch calls, keep yield pattern. Add placeholder yields for long latency endpoints if desired.</p>
					<p>Want MDX? Preprocess markdown to JSX and stream sections incrementally. Need auth? Inject a UserContext at the root with a session bootstrap yield.</p>
				</div>
				<a href="https://github.com/cristianfalcone/ajo-kit" class="inline-flex items-center gap-2 h-10 px-5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow ring-1 ring-indigo-500/30 dark:ring-indigo-400/30 transition">
					<span class="i-lucide-github" /> View Source
				</a>
			</div>
		</section>
		<section class="panel p-10 text-center space-y-6">
			<h3 class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Borrow the Pieces You Need</h3>
			<p class="max-w-2xl mx-auto text-sm leading-relaxed text-slate-700 dark:text-gray-300/80">
				ajo-kit is deliberately small. Use it as a reference implementation to understand how generator components and tiny routing interplay—then transplant the ideas back into your main stack.
			</p>
			<div class="flex flex-wrap justify-center gap-3 text-xs font-medium">
				{['Low Ceremony', 'Progressive Rendering', 'Scoped Context', 'Plain Mutations', 'Theme Layer'].map(t => (
					<span key={t} class="px-3 py-1 rounded-full bg-slate-900/5 ring-1 ring-slate-200 text-indigo-600/80 dark:bg-white/5 dark:ring-white/10 dark:text-indigo-200/80">
						{t}
					</span>
				))}
			</div>
		</section>
	</article>
)
