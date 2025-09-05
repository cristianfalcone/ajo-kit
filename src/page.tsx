import clsx from 'clsx'

const actions = [
  { href: 'https://github.com/cristianfalcone/ajo-kit', label: 'GitHub', primary: true },
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' },
  { href: '/products', label: 'Shop' },
]

export default () => (
  <div class="relative py-28 sm:py-36 lg:py-40">
    <div class="pointer-events-none absolute inset-0 flex items-start justify-center">
      <div class="mt-10 h-72 w-72 sm:h-96 sm:w-96 rounded-full blur-3xl opacity-50 bg-[radial-gradient(circle_at_55%_55%,rgba(99,102,241,0.55),rgba(139,92,246,0.35),rgba(236,72,153,0.15)_70%,transparent_75%)] dark:bg-[conic-gradient(at_70%_70%,#6366f1_0deg,#8b5cf6_90deg,#ec4899_180deg,#6366f1_360deg)] transition-colors" />
    </div>
    <section class="relative mx-auto max-w-3xl text-center space-y-8">
      <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-balance text-slate-900 dark:text-white">
        Build composable apps with <span class="bg-clip-text text-transparent bg-[linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899)]">ajo‑kit</span>
      </h1>
      <p class="max-w-2xl mx-auto text-slate-600/85 dark:text-gray-300/80 text-lg leading-relaxed">
        A modern starter on top of &nbsp;
        <code class="px-1 rounded bg-white/10 text-indigo-200 text-sm">ajo</code>
        &nbsp;+&nbsp;
        <code class="px-1 rounded bg-white/10 text-indigo-200 text-sm">vite</code>
        <br />
        Lean primitives, nested layouts, simple SSR, no ceremony.
      </p>
      <div class="flex flex-wrap justify-center gap-3 pt-2">
        {actions.map(a => (
          <a
            href={a.href}
            class={clsx(
              'px-5 py-2.5 rounded-md text-sm font-medium transition backdrop-blur',
              a.primary
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow hover:shadow-lg'
                : 'bg-slate-900/5 hover:bg-slate-900/10 text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:hover:bg-white/20 dark:text-gray-200 dark:ring-white/10'
            )}
          >
            {a.label}
          </a>
        ))}
      </div>
    </section>
  </div>
)
