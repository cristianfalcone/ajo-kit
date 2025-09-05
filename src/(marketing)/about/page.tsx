export default () => (
	<article class="py-20 space-y-20">
		<header class="text-center space-y-8 max-w-4xl mx-auto">
			<h1 class="text-4xl sm:text-5xl font-bold tracking-tight leading-tight text-slate-900 dark:text-white">
				What is <span class="bg-clip-text text-transparent bg-[linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899)]">ajo-kit</span>?
			</h1>
			<p class="text-slate-600 dark:text-gray-300/80 leading-relaxed text-lg">
				A tiny experimental SSR + progressive streaming playground that favors
				generator components, composable async flows, and minimal abstractions.
				This demo stitches together a marketing site, blog, and shop to show how the
				primitives stay calm even as features grow.
			</p>
			<div class="flex flex-wrap justify-center gap-3 text-[11px] font-medium">
				{['Generator Components', 'Streaming SSR', 'Context-less Data Flow', 'Tiny Router', 'File System Routes', 'Progressive Enhancement'].map(t => (
					<span key={t} class="px-3 py-1 rounded-full bg-slate-900/5 ring-1 ring-slate-200 text-indigo-600/80 dark:bg-white/5 dark:ring-white/10 dark:text-indigo-200/80">{t}</span>
				))}
			</div>
		</header>

		<section class="max-w-6xl mx-auto grid gap-8 md:grid-cols-3">
			{[
				['Zero Ceremony', 'Create a generator function, yield UI, move on. No giant lifecycle surface area.'],
				['Async First', 'Await data inside the generator; subsequent yields update seamlessly.'],
				['State by Progress', 'Re-yield instead of diffing complex mutation graphs. Simpler mental model.'],
				['Context Lite', 'Provide small contextual helpers (cart, queries) without sprawling global stores.'],
				['Route = File', 'Just drop `page.tsx` / `layout.tsx`. Dynamic segments & groups are minimal.'],
				['Portable Patterns', 'No lock-in. Patterns map to any UI framework with slight adaptation.']
			].map(([title, body]) => (
				<div key={title} class="panel p-6 space-y-4">
					<h2 class="text-sm font-semibold tracking-wide uppercase text-indigo-600 dark:text-indigo-300">{title}</h2>
					<p class="text-sm leading-relaxed text-slate-700 dark:text-gray-300/80">{body}</p>
				</div>
			))}
		</section>

		<section class="max-w-5xl mx-auto space-y-10">
			<div class="grid md:grid-cols-2 gap-8 items-start">
				<div class="panel p-6 space-y-5">
					<h3 class="text-sm font-semibold tracking-wide uppercase text-indigo-600 dark:text-indigo-300">Architecture Sketch</h3>
					<ul class="space-y-3 text-[13px] leading-relaxed text-slate-700 dark:text-gray-300/80">
						<li><span class="text-indigo-300/80">1.</span> Generators yield pending → resolved states (loading spinners, hydrated content).</li>
						<li><span class="text-indigo-300/80">2.</span> File system loader resolves layouts & pages concurrently, composes tree after await.</li>
						<li><span class="text-indigo-300/80">3.</span> Query + Cart contexts are thin reactive wrappers around plain objects.</li>
						<li><span class="text-indigo-300/80">4.</span> Client nav swaps page generator, restoring scroll & streaming next payload.</li>
						<li><span class="text-indigo-300/80">5.</span> Styling stays utility-first; components are zero-runtime wrappers.</li>
					</ul>
				</div>
				<div class="panel p-6 space-y-5">
					<h3 class="text-sm font-semibold tracking-wide uppercase text-indigo-600 dark:text-indigo-300">Why It Feels Fast</h3>
					<ul class="space-y-3 text-[13px] leading-relaxed text-slate-700 dark:text-gray-300/80">
						<li>Early paint via partial yields before all data settles.</li>
						<li>Granular suspense without magic boundaries—just control flow.</li>
						<li>No giant state machine: each generator owns its own tempo.</li>
						<li>Router + patterns fit in a single small file, easy to audit.</li>
						<li>Cheap local reactivity (plain mutations + `this.next()`).</li>
					</ul>
				</div>
			</div>
			<div class="panel p-8 text-center space-y-6">
				<h3 class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Experiment Friendly</h3>
				<p class="max-w-2xl mx-auto text-sm leading-relaxed text-slate-700 dark:text-gray-300/80">
					ajo-kit is not a framework replacement—it is a teaching surface.
					Borrow the ideas, remix the patterns, or just explore how little you need to build something pleasant.
				</p>
				<a href="/products" class="inline-flex items-center justify-center h-10 px-5 rounded-md bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-700 dark:bg-indigo-500/30 dark:hover:bg-indigo-500/40 dark:text-indigo-100 text-sm font-medium ring-1 ring-indigo-500/30 dark:ring-indigo-400/30 transition">Explore the Demo</a>
			</div>
		</section>
	</article>
)
